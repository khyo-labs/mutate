import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { mutApi } from '@/api/mutations';
import { ConversionTypeSelector } from '@/components/conversion-type-selector';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { JsonConfigPanel } from '@/components/json-config-panel';
import { Layout } from '@/components/layouts';
import { RuleBuilder } from '@/components/rule-builder';
import { SpreadsheetPreview } from '@/components/spreadsheet-preview';
import { Button } from '@/components/ui/button';
import type {
	Configuration,
	ConversionType,
	TransformationRule,
} from '@/types';

export const Route = createFileRoute('/mutations/new')({
	component: NewConfigurationComponent,
});

const configurationSchema = z.object({
	name: z.string().min(1, 'Configuration name is required'),
	description: z.string(),
});

type ConfigurationFormData = z.infer<typeof configurationSchema>;

function getDefaultOutputFormat(conversionType: ConversionType) {
	switch (conversionType) {
		case 'XLSX_TO_CSV':
		case 'PDF_TO_CSV':
		case 'JSON_TO_CSV':
			return {
				type: 'CSV' as const,
				delimiter: ',',
				encoding: 'UTF-8' as const,
				includeHeaders: true,
			};
		case 'DOCX_TO_PDF':
		case 'HTML_TO_PDF':
			return {
				type: 'PDF' as const,
				pageSize: 'A4' as const,
				orientation: 'portrait' as const,
				margins: { top: 20, bottom: 20, left: 20, right: 20 },
			};
		case 'CSV_TO_JSON':
			return {
				type: 'JSON' as const,
				prettyPrint: true,
				encoding: 'UTF-8' as const,
			};
		default:
			return {
				type: 'CSV' as const,
				delimiter: ',',
				encoding: 'UTF-8' as const,
				includeHeaders: true,
			};
	}
}

export function NewConfigurationComponent() {
	const navigate = useNavigate();
	const [conversionType, setConversionType] =
		useState<ConversionType>('XLSX_TO_CSV');
	const [rules, setRules] = useState<TransformationRule[]>([]);
	const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
	const createConfiguration = useMutation({
		mutationFn: (data: ConfigurationFormData) =>
			mutApi.create({
				...data,
				conversionType,
				inputFormat: conversionType.split('_TO_')[0] as any,
				rules,
				outputFormat: getDefaultOutputFormat(conversionType),
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
	});
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
	});

	const formData = watch();

	async function onSubmit(data: ConfigurationFormData) {
		try {
			const configurationData = {
				name: data.name.trim(),
				description: data.description.trim(),
				conversionType,
				inputFormat: conversionType.split('_TO_')[0] as any,
				outputFormat: getDefaultOutputFormat(conversionType),
				rules,
			};

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
				<div className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-700">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
						Mutation Studio
					</h1>
					<p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
						Create a new data transformation
					</p>
				</div>

				{/* Conversion Type Selection */}
				<div className="mb-8">
					<ConversionTypeSelector
						selectedType={conversionType}
						onTypeSelect={setConversionType}
					/>
				</div>

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
					{/* Left Column - Main Content Area */}
					<div className="space-y-8 xl:col-span-8">
						{/* Transformation Rules Card - Larger Space */}
						<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									Transformation Rules
								</h2>
								<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
									Build your data transformation pipeline step by step
								</p>
							</div>
							<div className="p-6">
								<RuleBuilder rules={rules} onChange={setRules} />
							</div>
						</div>

						{/* Data Preview Tabs */}
						<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
											Data Preview
										</h2>
										<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
											See how your transformations affect the data
										</p>
									</div>
									{/* Tab Navigation */}
									<div className="flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
										<button
											onClick={() => setActiveTab('preview')}
											className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
												activeTab === 'preview'
													? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100'
													: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
											}`}
										>
											Live Preview
										</button>
										<button
											onClick={() => setActiveTab('data')}
											className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
												activeTab === 'data'
													? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100'
													: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
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
										<h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
											Live Preview
										</h3>
										<SpreadsheetPreview file={uploadedFile} rules={rules} />
									</div>
								) : (
									<div>
										<h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
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
						<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									Output Preview
								</h2>
								<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
					<div className="space-y-8 xl:col-span-4">
						{/* Configuration Details Card */}
						<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									Configuration
								</h2>
								<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
									Basic settings for your transformation
								</p>
							</div>
							<div className="space-y-5 p-6">
								<div>
									<label
										htmlFor="name"
										className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Name <span className="text-red-500">*</span>
									</label>
									<input
										{...register('name')}
										type="text"
										id="name"
										placeholder="Enter configuration name"
										className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
									/>
									{errors.name && (
										<p className="mt-2 text-sm text-red-600">
											{errors.name.message}
										</p>
									)}
								</div>
								<div>
									<label
										htmlFor="description"
										className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Description
									</label>
									<input
										{...register('description')}
										type="text"
										id="description"
										placeholder="Enter description (optional)"
										className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
									/>
								</div>
							</div>
						</div>

						{/* JSON Configuration Card */}
						<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									JSON Configuration
								</h2>
								<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
				<div className="mt-12 border-t border-gray-200 pt-6 dark:border-gray-700">
					<div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
						<div className="text-sm text-gray-600 dark:text-gray-400">
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
							<span className="ml-4 text-gray-500 dark:text-gray-400">
								{rules.length} transformation rule
								{rules.length !== 1 ? 's' : ''} configured
							</span>
						</div>

						<div className="flex space-x-3">
							<Button
								type="button"
								onClick={handleCancel}
								variant="outline"
								className="px-6 py-2.5"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								onClick={handleSubmit(onSubmit)}
								disabled={
									createConfiguration.isPending || !formData.name?.trim()
								}
								className="bg-blue-600 px-6 py-2.5 hover:bg-blue-700 focus:ring-blue-500"
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
	);
}
