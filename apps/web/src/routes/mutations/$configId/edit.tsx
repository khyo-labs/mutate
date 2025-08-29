import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { mutApi } from '@/api/mutations';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { JsonConfigPanel } from '@/components/json-config-panel';
import { Layout } from '@/components/layouts';
import { MutationSidebar } from '@/components/mutations/mutation-sidebar';
import { RuleBuilder } from '@/components/rule-builder';
import { SpreadsheetPreview } from '@/components/spreadsheet-preview';
import { Button } from '@/components/ui/button';
import type { Configuration, TransformationRule } from '@/types';

export const Route = createFileRoute('/mutations/$configId/edit')({
	component: ConfigurationEditComponent,
});

interface FormData {
	name: string;
	description: string;
	rules: TransformationRule[];
	webhookUrlId?: string;
}

export function ConfigurationEditComponent() {
	const { configId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
	const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');

	// Fetch configuration data
	const {
		data: config,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['configurations', configId],
		queryFn: async () => mutApi.get(configId),
		enabled: !!configId,
	})

	// Fetch organization webhooks for the selector
	const { data: webhooks = [] } = useQuery({
		queryKey: ['organization', 'webhooks'],
		queryFn: async () => {
			const response = await fetch('/api/v1/organizations/webhooks', {
				credentials: 'include',
			})
			if (!response.ok) throw new Error('Failed to fetch webhooks');
			const data = await response.json();
			return data.data || [];
		},
	})

	// Form setup with react-hook-form
	const form = useForm<FormData>({
		defaultValues: {
			name: '',
			description: '',
			rules: [],
			webhookUrlId: undefined,
		},
	})

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
		setValue,
		reset,
	} = form;

	// Watch form values for live preview
	const watchedName = watch('name');
	const watchedDescription = watch('description');
	const watchedRules = watch('rules');

	// Update form when configuration data is loaded
	useEffect(() => {
		if (config) {
			reset({
				name: config.name,
				description: config.description || '',
				rules: config.rules,
				webhookUrlId: undefined,
			})
		}
	}, [config, reset]);

	// Update configuration mutation
	const updateConfigurationMutation = useMutation({
		mutationFn: async (data: FormData) => {
			// Only send fields that have values and validate rules
			const configurationData: any = {};

			if (data.name && data.name.trim()) {
				configurationData.name = data.name.trim();
			}

			if (data.description !== undefined) {
				configurationData.description = data.description.trim();
			}

			// Only send rules if we have at least one rule
			if (data.rules && data.rules.length > 0) {
				configurationData.rules = data.rules;
			}

			// Include webhook URL ID if selected
			if (data.webhookUrlId) {
				configurationData.webhookUrlId = data.webhookUrlId;
			} else {
				configurationData.webhookUrlId = null; // Explicitly set to null to clear
			}

			// Always include outputFormat
			configurationData.outputFormat = {
				type: 'CSV' as const,
				delimiter: ',',
				encoding: 'UTF-8' as const,
				includeHeaders: true,
			}

			console.log('Sending update request:', configurationData);

			const updatedConfig = await mutApi.update(configId, configurationData);

			console.log('Update response:', updatedConfig);

			return updatedConfig;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['configurations'] });
			queryClient.invalidateQueries({ queryKey: ['configurations', configId] });
			navigate({ to: '/mutations/$configId', params: { configId } });
		},
		onError: (error) => {
			console.error('Failed to update configuration:', error);
			console.error('Error details:', error);
			alert(`Failed to update configuration: ${error.message}`);
		},
	})

	const onSubmit = (data: FormData) => {
		// Validate that we have at least one rule
		if (!data.rules || data.rules.length === 0) {
			alert('Please add at least one transformation rule before saving.');
			return
		}

		updateConfigurationMutation.mutate(data);
	}

	function handleCancel() {
		navigate({ to: '/mutations/$configId', params: { configId } });
	}

	function handleImportConfig(importedConfig: {
		name: string;
		description: string;
		rules: TransformationRule[];
		outputFormat: Configuration['outputFormat'];
	}) {
		setValue('name', importedConfig.name);
		setValue('description', importedConfig.description);
		setValue('rules', importedConfig.rules);
	}

	if (isLoading) {
		return (
			<Layout>
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
						<p className="text-muted-foreground mt-4">
							Loading configuration...
						</p>
					</div>
				</div>
			</Layout>
		)
	}

	if (error) {
		return (
			<Layout>
				<div className="bg-destructive/10 rounded-md p-4">
					<div className="text-destructive text-sm">{error.message}</div>
				</div>
			</Layout>
		)
	}

	if (!config) {
		return (
			<Layout>
				<div className="py-12 text-center">
					<h2 className="text-foreground text-xl font-semibold">
						Configuration not found
					</h2>
					<p className="text-muted-foreground mt-2">
						The configuration you're looking for doesn't exist.
					</p>
					<Button
						variant='outline'
						onClick={() => navigate({ to: '/mutations' })}
						className='mt-4'
					>
						Back to mutations
					</Button>
				</div>
			</Layout>
		)
	}

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Header Section */}
				<div className="mb-8 border-b border-gray-200 pb-6">
					<div className="mb-4 flex items-center space-x-4">
						<button
							onClick={handleCancel}
							className="flex items-center text-gray-600 transition-colors hover:text-gray-900"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Mutation
						</button>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Edit Mutation
							</h1>
							<p className="mt-2 text-lg text-gray-600">
								Modify your data transformation mutation
							</p>
						</div>

						<div className="mt-4 flex space-x-3 sm:mt-0">
							<Button
								variant='outline'
								onClick={() =>
									navigate({
										to: '/mutations/$configId',
										params: { configId },
									})
								}
								className='px-4 py-2'
							>
								<Eye className="mr-2 h-4 w-4" />
								Preview
							</Button>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Main Content Grid */}
					<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
						{/* Left Column - Main Content Area */}
						<div className="space-y-8 xl:col-span-8">
							{/* Transformation Rules Card - Larger Space */}
							<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
								<div className="border-b border-gray-200 px-6 py-5">
									<h2 className="text-xl font-semibold text-gray-900">
										Transformation Rules
									</h2>
									<p className="mt-1 text-sm text-gray-600">
										Build your data transformation pipeline step by step
									</p>
								</div>
								<div className='p-6'>
									<Controller
										name='rules'
										control={control}
										render={({ field: { onChange, value } }) => (
											<RuleBuilder rules={value} onChange={onChange} />
										)}
									/>
								</div>
							</div>

							{/* Data Preview Tabs */}
							<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
								<div className="border-b border-gray-200 px-6 py-5">
									<div className="flex items-center justify-between">
										<div>
											<h2 className="text-xl font-semibold text-gray-900">
												Data Preview
											</h2>
											<p className="mt-1 text-sm text-gray-600">
												See how your transformations affect the data
											</p>
										</div>
										{/* Tab Navigation */}
										<div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
											<button
												onClick={() => setActiveTab('preview')}
												className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
													activeTab === 'preview'
														? 'bg-white text-gray-900 shadow-sm'
														: 'text-gray-600 hover:text-gray-900'
												}`}
											>
												Live Preview
											</button>
											<button
												onClick={() => setActiveTab('data')}
												className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
													activeTab === 'data'
														? 'bg-white text-gray-900 shadow-sm'
														: 'text-gray-600 hover:text-gray-900'
												}`}
											>
												Sample Data
											</button>
										</div>
									</div>
								</div>
								<div className='p-6'>
									{activeTab === 'preview' ? (
										<div>
											<h3 className="mb-4 text-lg font-medium text-gray-900">
												Live Preview
											</h3>
											<SpreadsheetPreview
												file={uploadedFile}
												rules={watchedRules}
											/>
										</div>
									) : (
										<div>
											<h3 className="mb-4 text-lg font-medium text-gray-900">
												Sample Data
											</h3>
											<FileUpload
												onFileUploaded={setUploadedFile}
												currentFile={uploadedFile}
											/>
										</div>
									)}
								</div>
							</div>

							{/* Output Preview Card */}
							<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
								<div className="border-b border-gray-200 px-6 py-5">
									<h2 className="text-xl font-semibold text-gray-900">
										Output Preview
									</h2>
									<p className="mt-1 text-sm text-gray-600">
										Preview the final CSV output with your transformations
										applied
									</p>
								</div>
								<div className='p-6'>
									<CsvOutputPreview
										file={uploadedFile}
										rules={watchedRules}
										outputFormat={{
											type: 'CSV',
											delimiter: ',',
											encoding: 'UTF-8',
											includeHeaders: true,
										}}
									/>
								</div>
							</div>
						</div>

						{/* Right Column - Configuration Sidebar */}
						<div className="space-y-8 xl:col-span-4">
							{/* Configuration Details Card */}
							<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
								<div className="border-b border-gray-200 px-6 py-5">
									<h2 className="text-xl font-semibold text-gray-900">
										Configuration
									</h2>
									<p className="mt-1 text-sm text-gray-600">
										Basic settings for your transformation
									</p>
								</div>
								<div className="space-y-5 p-6">
									<div>
										<label
											htmlFor='name'
											className="mb-2 block text-sm font-medium text-gray-700"
										>
											Name <span className="text-red-500">*</span>
										</label>
										<Controller
											name='name'
											control={control}
											rules={{ required: 'Mutation name is required' }}
											render={({ field }) => (
												<input
													{...field}
													type='text'
													id='name'
													placeholder='Enter mutation name'
													className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
												/>
											)}
										/>
										{errors.name && (
											<p className="mt-2 text-sm text-red-600">
												{errors.name.message}
											</p>
										)}
									</div>
									<div>
										<label
											htmlFor='description'
											className="mb-2 block text-sm font-medium text-gray-700"
										>
											Description
										</label>
										<Controller
											name='description'
											control={control}
											render={({ field }) => (
												<input
													{...field}
													type='text'
													id='description'
													placeholder="Enter description (optional)"
													className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
												/>
											)}
										/>
									</div>
									<div>
										<label
											htmlFor='webhookUrlId'
											className="mb-2 block text-sm font-medium text-gray-700"
										>
											Webhook URL
										</label>
										<Controller
											name='webhookUrlId'
											control={control}
											render={({ field }) => (
												<select
													{...field}
													id='webhookUrlId'
													className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
												>
													<option value="">Use organization default</option>
													{webhooks.map((webhook: any) => (
														<option key={webhook.id} value={webhook.id}>
															{webhook.name}{' '}
															{webhook.isDefault ? '(Default)' : ''}
														</option>
													))}
												</select>
											)}
										/>
										<p className="mt-1 text-xs text-gray-500">
											Select a specific webhook URL for this configuration, or
											leave blank to use the organization default.
										</p>
									</div>
								</div>
							</div>

							{/* JSON Configuration Card */}
							<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
								<div className="border-b border-gray-200 px-6 py-5">
									<h2 className="text-xl font-semibold text-gray-900">
										JSON Configuration
									</h2>
									<p className="mt-1 text-sm text-gray-600">
										Import/export configuration as JSON
									</p>
								</div>
								<div className='p-6'>
									<JsonConfigPanel
										name={watchedName}
										description={watchedDescription}
										rules={watchedRules}
										outputFormat={{
											type: 'CSV',
											delimiter: ',',
											encoding: 'UTF-8',
											includeHeaders: true,
										}}
										onImport={handleImportConfig}
									/>
								</div>
							</div>

							{/* API Usage Sidebar */}
							<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
								<div className="border-b border-gray-200 px-6 py-5">
									<h2 className="text-xl font-semibold text-gray-900">
										API Usage
									</h2>
									<p className="mt-1 text-sm text-gray-600">
										Integration details and usage
									</p>
								</div>
								<div className='p-6'>
									<MutationSidebar config={config} />
								</div>
							</div>
						</div>
					</div>

					{/* Action Bar */}
					<div className="mt-12 border-t border-gray-200 pt-6">
						<div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
							<div className="text-sm text-gray-600">
								{uploadedFile ? (
									<span className="flex items-center">
										<span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
										File uploaded: {uploadedFile.name}
									</span>
								) : (
									<span className="flex items-center">
										<span className="mr-2 h-2 w-2 rounded-full bg-gray-400"></span>
										No file uploaded
									</span>
								)}
								{/* Rules count */}
								<span className="ml-4 text-gray-500">
									{watchedRules.length} transformation rule
									{watchedRules.length !== 1 ? 's' : ''} configured
								</span>
							</div>

							<div className="flex space-x-3">
								<Button
									type='button'
									variant='outline'
									onClick={handleCancel}
									className='px-6 py-2.5'
								>
									Cancel
								</Button>
								<Button
									type='submit'
									disabled={
										isSubmitting || updateConfigurationMutation.isPending
									}
									className="bg-blue-600 px-6 py-2.5 hover:bg-blue-700 focus:ring-blue-500"
								>
									<Save className="mr-2 h-4 w-4" />
									{isSubmitting || updateConfigurationMutation.isPending
										? 'Saving...'
										: 'Save Changes'}
								</Button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</Layout>
	)
}
