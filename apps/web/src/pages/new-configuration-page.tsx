import { useNavigate } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import { useState } from 'react';

import { CsvOutputPreview } from '../components/csv-output-preview';
import { FileUpload, type UploadedFile } from '../components/file-upload';
import { JsonConfigPanel } from '../components/json-config-panel';
import { Layout } from '../components/layout';
import { RuleBuilder } from '../components/rule-builder';
import { SpreadsheetPreview } from '../components/spreadsheet-preview';
import { useConfigurationStore } from '../stores/config-store';
import type { Configuration, TransformationRule } from '../types';

export function NewConfigurationPage() {
	const navigate = useNavigate();
	const { createConfiguration } = useConfigurationStore();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [rules, setRules] = useState<TransformationRule[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

	async function handleSave() {
		if (!name.trim()) {
			alert('Please enter a configuration name');
			return;
		}

		setIsLoading(true);
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

			await createConfiguration(configurationData);
			navigate({ to: '/configurations' });
		} catch (error) {
			console.error('Failed to create configuration:', error);
			alert('Failed to create configuration');
		} finally {
			setIsLoading(false);
		}
	}

	function handleCancel() {
		navigate({ to: '/configurations' });
	}

	function handleImportConfig(importedConfig: {
		name: string;
		description: string;
		rules: TransformationRule[];
		outputFormat: Configuration['outputFormat'];
	}) {
		setName(importedConfig.name);
		setDescription(importedConfig.description);
		setRules(importedConfig.rules);
		// Note: outputFormat is handled internally by the component, could be extended if needed
	}

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-gray-900">
						New Configuration
					</h1>
					<p className="mt-2 text-gray-600">
						Create a new data transformation configuration
					</p>
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
							<h2 className="text-lg font-medium text-gray-900">Sample Data</h2>
							<p className="text-sm text-gray-600">
								Upload a sample Excel file to preview how your transformations
								will affect the data
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
							<p className="mb-4 text-sm text-gray-600">
								See how your transformation rules will affect the uploaded data
							</p>
							<SpreadsheetPreview file={uploadedFile} rules={rules} />
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
						disabled={isLoading || !name.trim()}
						className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Save className="mr-2 h-4 w-4" />
						{isLoading ? 'Creating...' : 'Create Configuration'}
					</button>
				</div>
			</div>
		</Layout>
	);
}
