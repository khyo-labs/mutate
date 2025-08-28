import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { api } from '@/api/client';
import { mutApi } from '@/api/mutations';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { JsonConfigPanel } from '@/components/json-config-panel';
import { Layout } from '@/components/layout';
import { MutationSidebar } from '@/components/mutations/mutation-sidebar';
import { RuleBuilder } from '@/components/rule-builder';
import { SpreadsheetPreview } from '@/components/spreadsheet-preview';
import { Button } from '@/components/ui/button';
import type { ApiResponse, Configuration, TransformationRule } from '@/types';

export const Route = createFileRoute('/mutations/$configId/edit')({
	component: ConfigurationEditComponent,
});

interface FormData {
	name: string;
	description: string;
	rules: TransformationRule[];
}

export function ConfigurationEditComponent() {
	const { configId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

	// Fetch configuration data
	const {
		data: config,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['configurations', configId],
		queryFn: async () => mutApi.get(configId),
		enabled: !!configId,
	});

	// Form setup with react-hook-form
	const form = useForm<FormData>({
		defaultValues: {
			name: '',
			description: '',
			rules: [],
		},
	});

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
			});
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

			// Always include outputFormat
			configurationData.outputFormat = {
				type: 'CSV' as const,
				delimiter: ',',
				encoding: 'UTF-8' as const,
				includeHeaders: true,
			};

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
	});

	const onSubmit = (data: FormData) => {
		// Validate that we have at least one rule
		if (!data.rules || data.rules.length === 0) {
			alert('Please add at least one transformation rule before saving.');
			return;
		}

		updateConfigurationMutation.mutate(data);
	};

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
		);
	}

	if (error) {
		return (
			<Layout>
				<div className="bg-destructive/10 rounded-md p-4">
					<div className="text-destructive text-sm">{error.message}</div>
				</div>
			</Layout>
		);
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
						variant="outline"
						onClick={() => navigate({ to: '/mutations' })}
						className="mt-4"
					>
						Back to mutations
					</Button>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<div className="mb-4 flex items-center space-x-4">
						<button
							onClick={handleCancel}
							className="text-muted-foreground hover:text-foreground flex items-center transition-colors"
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							Back to Mutation
						</button>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-foreground text-2xl font-bold">
								Edit Mutation
							</h1>
							<p className="text-muted-foreground mt-2">
								Modify your data transformation mutation
							</p>
						</div>

						<div className="mt-4 flex space-x-3 sm:mt-0">
							<Button
								variant="outline"
								onClick={() =>
									navigate({
										to: '/mutations/$configId',
										params: { configId },
									})
								}
							>
								<Eye className="mr-2 h-4 w-4" />
								Preview
							</Button>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						{/* Left Column */}
						<div className="space-y-6 xl:col-span-1">
							{/* Configuration Details */}
							<div className="bg-card rounded-lg border p-6">
								<h2 className="text-card-foreground mb-4 text-lg font-medium">
									Mutation Details *
								</h2>
								<div className="space-y-4">
									<div>
										<label
											htmlFor="name"
											className="text-card-foreground block text-sm font-medium"
										>
											Name
										</label>
										<Controller
											name="name"
											control={control}
											rules={{ required: 'Mutation name is required' }}
											render={({ field }) => (
												<input
													{...field}
													type="text"
													id="name"
													placeholder="Enter mutation name"
													className="border-input bg-background text-foreground focus:border-primary focus:ring-primary mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1"
												/>
											)}
										/>
										{errors.name && (
											<p className="text-destructive mt-1 text-sm">
												{errors.name.message}
											</p>
										)}
									</div>
									<div>
										<label
											htmlFor="description"
											className="text-card-foreground block text-sm font-medium"
										>
											Description
										</label>
										<Controller
											name="description"
											control={control}
											render={({ field }) => (
												<input
													{...field}
													type="text"
													id="description"
													placeholder="Enter description (optional)"
													className="border-input bg-background text-foreground focus:border-primary focus:ring-primary mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1"
												/>
											)}
										/>
									</div>
								</div>
							</div>

							{/* File Upload */}
							<div className="space-y-4">
								<h2 className="text-foreground text-lg font-medium">
									Sample Data
								</h2>
								<p className="text-muted-foreground text-sm">
									Upload a sample Excel file to preview how your mutation will
									affect the data
								</p>
								<FileUpload
									onFileUploaded={setUploadedFile}
									currentFile={uploadedFile}
								/>
							</div>

							{/* Rule Builder */}
							<div className="bg-card rounded-lg border p-6">
								<h2 className="text-card-foreground mb-4 text-lg font-medium">
									Mutation Steps
								</h2>
								<Controller
									name="rules"
									control={control}
									render={({ field: { onChange, value } }) => (
										<RuleBuilder rules={value} onChange={onChange} />
									)}
								/>
							</div>
						</div>

						{/* Middle Column - Preview */}
						<div className="space-y-6 xl:col-span-1">
							<div>
								<h2 className="text-foreground text-lg font-medium">
									Live Preview
								</h2>
								<p className="text-muted-foreground mb-4 text-sm">
									See how your mutation steps will affect the uploaded
									data
								</p>
								<SpreadsheetPreview file={uploadedFile} rules={watchedRules} />
							</div>

							<div>
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

							<div>
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

						{/* Right Column - API Usage */}
						<div className="xl:col-span-1">
							<MutationSidebar config={config} />
						</div>
					</div>

					{/* Actions */}
					<div className="mt-8 flex justify-end space-x-4">
						<Button type="button" variant="outline" onClick={handleCancel}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || updateConfigurationMutation.isPending}
						>
							<Save className="mr-2 h-4 w-4" />
							{isSubmitting || updateConfigurationMutation.isPending
								? 'Saving...'
								: 'Save Changes'}
						</Button>
					</div>
				</form>
			</div>
		</Layout>
	);
}
