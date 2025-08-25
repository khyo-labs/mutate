import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Layout } from '../components/layout';
import { RuleBuilder } from '../components/rule-builder';
import { FileUpload, type UploadedFile } from '../components/file-upload';
import { SpreadsheetPreview } from '../components/spreadsheet-preview';
import { CsvOutputPreview } from '../components/csv-output-preview';
import { JsonConfigPanel } from '../components/json-config-panel';
import { useConfigurationStore } from '../stores/config-store';
import type { Configuration, TransformationRule } from '../types';

export function ConfigurationBuilderPage() {
	const { configId } = useParams({ from: '/configurations/$configId/builder' });
	const navigate = useNavigate();
	const { 
		fetchConfiguration, 
		updateConfiguration, 
		currentConfiguration, 
		isLoading, 
		error 
	} = useConfigurationStore();

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [rules, setRules] = useState<TransformationRule[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

	useEffect(() => {
		if (configId) {
			fetchConfiguration(configId);
		}
	}, [configId, fetchConfiguration]);

	useEffect(() => {
		if (currentConfiguration) {
			setName(currentConfiguration.name);
			setDescription(currentConfiguration.description || '');
			setRules(currentConfiguration.rules);
		}
	}, [currentConfiguration]);

	async function handleSave() {
		if (!name.trim()) {
			alert('Please enter a configuration name');
			return;
		}

		if (!configId) return;

		setIsSaving(true);
		try {
			const configurationData = {
				name: name.trim(),
				description: description.trim(),
				rules,
				outputFormat: {
					type: 'CSV' as const,
					delimiter: ',',
					encoding: 'UTF-8' as const,
					includeHeaders: true,
				},
			};

			await updateConfiguration(configId, configurationData);
			navigate({ to: '/configurations/$configId', params: { configId } });
		} catch (error) {
			console.error('Failed to update configuration:', error);
			alert('Failed to update configuration');
		} finally {
			setIsSaving(false);
		}
	}

	function handleCancel() {
		navigate({ to: '/configurations/$configId', params: { configId } });
	}

	function handleImportConfig(importedConfig: { name: string; description: string; rules: TransformationRule[]; outputFormat: Configuration['outputFormat'] }) {
		setName(importedConfig.name);
		setDescription(importedConfig.description);
		setRules(importedConfig.rules);
	}

	if (isLoading) {
		return (
			<Layout>
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
						<p className="mt-4 text-gray-600">Loading configuration...</p>
					</div>
				</div>
			</Layout>
		);
	}

	if (error) {
		return (
			<Layout>
				<div className="rounded-md bg-red-50 p-4">
					<div className="text-sm text-red-700">{error}</div>
				</div>
			</Layout>
		);
	}

	if (!currentConfiguration) {
		return (
			<Layout>
				<div className="text-center py-12">
					<h2 className="text-xl font-semibold text-gray-900">Configuration not found</h2>
					<p className="mt-2 text-gray-600">The configuration you're looking for doesn't exist.</p>
					<button
						onClick={() => navigate({ to: '/configurations' })}
						className="mt-4 btn btn-primary"
					>
						Back to Configurations
					</button>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center space-x-4 mb-4">
						<button
							onClick={handleCancel}
							className="flex items-center text-gray-600 hover:text-gray-900"
						>
							<ArrowLeft className="h-4 w-4 mr-1" />
							Back to Configuration
						</button>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Edit Configuration</h1>
							<p className="mt-2 text-gray-600">
								Modify your data transformation configuration
							</p>
						</div>

						<div className="mt-4 sm:mt-0 flex space-x-3">
							<button
								onClick={() => navigate({ to: '/configurations/$configId', params: { configId } })}
								className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
							>
								<Eye className="mr-2 h-4 w-4" />
								Preview
							</button>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Left Column */}
					<div className="space-y-6">
						{/* Configuration Details */}
						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<h2 className="mb-4 text-lg font-medium text-gray-900">
								Configuration Details
							</h2>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="name"
										className="block text-sm font-medium text-gray-700"
									>
										Name *
									</label>
									<input
										type="text"
										id="name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Enter configuration name"
										className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
									/>
								</div>
								<div>
									<label
										htmlFor="description"
										className="block text-sm font-medium text-gray-700"
									>
										Description
									</label>
									<input
										type="text"
										id="description"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Enter description (optional)"
										className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
									/>
								</div>
							</div>
						</div>

						{/* File Upload */}
						<div className="space-y-4">
							<h2 className="text-lg font-medium text-gray-900">
								Sample Data
							</h2>
							<p className="text-sm text-gray-600">
								Upload a sample Excel file to preview how your transformations will affect the data
							</p>
							<FileUpload 
								onFileUploaded={setUploadedFile} 
								currentFile={uploadedFile} 
							/>
						</div>

						{/* Rule Builder */}
						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<h2 className="mb-4 text-lg font-medium text-gray-900">
								Transformation Rules
							</h2>
							<RuleBuilder rules={rules} onChange={setRules} />
						</div>
					</div>

					{/* Right Column - Preview */}
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-medium text-gray-900">
								Live Preview
							</h2>
							<p className="text-sm text-gray-600 mb-4">
								See how your transformation rules will affect the uploaded data
							</p>
							<SpreadsheetPreview 
								file={uploadedFile} 
								rules={rules}
							/>
						</div>
						
						<div>
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

						<div>
							<JsonConfigPanel
								name={name}
								description={description}
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

				{/* Actions */}
				<div className="mt-8 flex justify-end space-x-4">
					<button
						type="button"
						onClick={handleCancel}
						className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || !name.trim()}
						className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Save className="mr-2 h-4 w-4" />
						{isSaving ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</div>
		</Layout>
	);
}