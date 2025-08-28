import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { mutApi } from '@/api/mutations';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { JsonConfigPanel } from '@/components/json-config-panel';
import { Layout } from '@/components/layout';
import { RuleBuilder } from '@/components/rule-builder';
import { SpreadsheetPreview } from '@/components/spreadsheet-preview';
import { Button } from '@/components/ui/button';
import type { Configuration, TransformationRule } from '@/types';

export const Route = createFileRoute('/mutations/studio')({
	component: NewConfigurationComponent,
});

const configurationSchema = z.object({
	name: z.string().min(1, 'Configuration name is required'),
	description: z.string(),
});

type ConfigurationFormData = z.infer<typeof configurationSchema>;

export function NewConfigurationComponent() {
	const navigate = useNavigate();
	const [rules, setRules] = useState<TransformationRule[]>([]);
	const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
	const createConfiguration = useMutation({
		mutationFn: (data: ConfigurationFormData) =>
			mutApi.create({
				...data,
				rules,
				outputFormat: {
					type: 'CSV' as const,
					delimiter: ',',
					encoding: 'UTF-8' as const,
					includeHeaders: true,
				},
			}),
		onSuccess: () => {
			navigate({ to: '/mutations' });
		},
		onError: (error) => {
			console.error('Failed to create configuration:', error);
		},
		onSettled: () => {
			navigate({ to: '/mutations' });
		},
	})
	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<ConfigurationFormData>({
		resolver: zodResolver(configurationSchema),
		defaultValues: {
			name: '',
			description: '',
		},
	})

	const formData = watch();

	async function onSubmit(data: ConfigurationFormData) {
		try {
			const configurationData = {
				name: data.name.trim(),
				description: data.description.trim(),
				rules,
				outputFormat: {
					type: 'CSV' as const,
					delimiter: ',',
					encoding: 'UTF-8' as const,
					includeHeaders: true,
				},
			}

			await createConfiguration.mutateAsync(configurationData);
			navigate({ to: '/mutations' });
		} catch (error) {
			console.error('Failed to create configuration:', error);
			alert('Failed to create configuration');
		}
	}

	function handleCancel() {
		navigate({ to: '/mutations' });
	}

	function handleImportConfig(importedConfig: {
		name: string;
		description: string;
		rules: TransformationRule[];
		outputFormat: Configuration['outputFormat'];
	}) {
		// Note: Using setValue to update form values properly
		// setName(importedConfig.name);
		// setDescription(importedConfig.description);
		setRules(importedConfig.rules);
		// Note: outputFormat is handled internally by the component, could be extended if needed
	}

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Header Section */}
				<div className="mb-8 border-b border-gray-200 pb-6">
					<h1 className="text-3xl font-bold text-gray-900">Mutation Studio</h1>
					<p className="mt-2 text-lg text-gray-600">Create a new data transformation</p>
				</div>

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
					{/* Left Column - Main Content Area */}
					<div className="xl:col-span-8 space-y-8">
						{/* Transformation Rules Card - Larger Space */}
						<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
							<div className="px-6 py-5 border-b border-gray-200">
								<h2 className="text-xl font-semibold text-gray-900">Transformation Rules</h2>
								<p className="mt-1 text-sm text-gray-600">
									Build your data transformation pipeline step by step
								</p>
							</div>
							<div className="p-6">
								<RuleBuilder rules={rules} onChange={setRules} />
							</div>
						</div>

						{/* Data Preview Tabs */}
						<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
							<div className="px-6 py-5 border-b border-gray-200">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-xl font-semibold text-gray-900">Data Preview</h2>
										<p className="mt-1 text-sm text-gray-600">
											See how your transformations affect the data
										</p>
									</div>
									{/* Tab Navigation */}
									<div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
										<button
											onClick={() => setActiveTab('preview')}
											className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
												activeTab === 'preview'
													? 'bg-white text-gray-900 shadow-sm'
													: 'text-gray-600 hover:text-gray-900'
											}`}
										>
											Live Preview
										</button>
										<button
											onClick={() => setActiveTab('data')}
											className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
							<div className="p-6">
								{activeTab === 'preview' ? (
									<div>
										<h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
										<SpreadsheetPreview file={uploadedFile} rules={rules} />
									</div>
								) : (
									<div>
										<h3 className="text-lg font-medium text-gray-900 mb-4">Sample Data</h3>
										<FileUpload
											onFileUploaded={setUploadedFile}
											currentFile={uploadedFile}
										/>
									</div>
								)}
							</div>
						</div>

						{/* Output Preview Card */}
						<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
							<div className="px-6 py-5 border-b border-gray-200">
								<h2 className="text-xl font-semibold text-gray-900">Output Preview</h2>
								<p className="mt-1 text-sm text-gray-600">
									Preview the final CSV output with your transformations applied
								</p>
							</div>
							<div className="p-6">
								<CsvOutputPreview
									file={uploadedFile}
									rules={rules}
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
					<div className="xl:col-span-4 space-y-8">
						{/* Configuration Details Card */}
						<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
							<div className="px-6 py-5 border-b border-gray-200">
								<h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
								<p className="mt-1 text-sm text-gray-600">
									Basic settings for your transformation
								</p>
							</div>
							<div className="p-6 space-y-5">
								<div>
									<label
										htmlFor='name'
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Name <span className="text-red-500">*</span>
									</label>
									<input
										{...register('name')}
										type='text'
										id='name'
										placeholder="Enter configuration name"
										className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
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
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Description
									</label>
									<input
										{...register('description')}
										type='text'
										id='description'
										placeholder="Enter description (optional)"
										className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
									/>
								</div>
							</div>
						</div>

						{/* JSON Configuration Card */}
						<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
							<div className="px-6 py-5 border-b border-gray-200">
								<h2 className="text-xl font-semibold text-gray-900">JSON Configuration</h2>
								<p className="mt-1 text-sm text-gray-600">
									Import/export configuration as JSON
								</p>
							</div>
							<div className="p-6">
								<JsonConfigPanel
									name={formData.name}
									description={formData.description}
									rules={rules}
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
					</div>
				</div>

				{/* Action Bar */}
				<div className="mt-12 border-t border-gray-200 pt-6">
					<div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
						<div className="text-sm text-gray-600">
							{uploadedFile ? (
								<span className="flex items-center">
									<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
									File uploaded: {uploadedFile.name}
								</span>
							) : (
								<span className="flex items-center">
									<span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
									No file uploaded
								</span>
							)}
							{/* Rules count */}
							<span className="ml-4 text-gray-500">
								{rules.length} transformation rule{rules.length !== 1 ? 's' : ''} configured
							</span>
						</div>

						<div className="flex space-x-3">
							<Button
								type='button'
								onClick={handleCancel}
								variant="outline"
								className="px-6 py-2.5"
							>
								Cancel
							</Button>
							<Button
								type='submit'
								onClick={handleSubmit(onSubmit)}
								disabled={createConfiguration.isPending || !formData.name?.trim()}
								className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
							>
								<Save className="mr-2 h-4 w-4" />
								{createConfiguration.isPending
									? 'Creating...'
									: 'Create Configuration'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	)
}
