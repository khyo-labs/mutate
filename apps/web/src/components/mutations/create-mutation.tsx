import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
	Configuration,
	ConversionType,
	InputFormat,
	TransformationRule,
} from '@/types';

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

export function CreateMutation() {
	const navigate = useNavigate();
	const [conversionType, setConversionType] =
		useState<ConversionType>('XLSX_TO_CSV');
	const [rules, setRules] = useState<TransformationRule[]>([]);
	const createConfiguration = useMutation({
		mutationFn: (data: ConfigurationFormData) =>
			mutApi.create({
				...data,
				conversionType,
				inputFormat: conversionType.split('_TO_')[0] as InputFormat,
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
				inputFormat: conversionType.split('_TO_')[0] as InputFormat,
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
			<div className="mx-auto space-y-8 px-4 py-6 sm:px-6 lg:px-8">
				{/* Header Section */}
				<div className="border-b pb-6">
					<h1 className="text-foreground text-3xl font-bold">
						Mutation Studio
					</h1>
					<p className="text-muted-foreground mt-2 text-lg">
						Create a new data transformation
					</p>
				</div>

				<div className="mb-8">
					<ConversionTypeSelector
						selectedType={conversionType}
						onTypeSelect={setConversionType}
					/>
				</div>

				<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
					<div className="space-y-8 xl:col-span-8">
						<Card>
							<CardHeader>
								<CardTitle>Transformation Rules</CardTitle>
								<CardDescription>
									Build your data transformation pipeline step by step
								</CardDescription>
							</CardHeader>
							<CardContent>
								<RuleBuilder rules={rules} onChange={setRules} />
							</CardContent>
						</Card>

						<Tabs defaultValue="preview">
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle>Data Preview</CardTitle>
											<CardDescription>
												See how your transformations affect the data
											</CardDescription>
										</div>
										<TabsList>
											<TabsTrigger value="preview">Live Preview</TabsTrigger>
											<TabsTrigger value="data">Sample Data</TabsTrigger>
										</TabsList>
									</div>
								</CardHeader>
								<CardContent>
									<TabsContent value="preview">
										<h3 className="text-foreground mb-4 text-lg font-medium">
											Live Preview
										</h3>
										<SpreadsheetPreview file={uploadedFile} rules={rules} />
									</TabsContent>
									<TabsContent value="data">
										<h3 className="text-foreground mb-4 text-lg font-medium">
											Sample Data
										</h3>
										<FileUpload
											onFileUploaded={setUploadedFile}
											currentFile={uploadedFile}
										/>
									</TabsContent>
								</CardContent>
							</Card>
						</Tabs>

						<Card>
							<CardHeader>
								<CardTitle>Output Preview</CardTitle>
								<CardDescription>
									Preview the final CSV output with your transformations applied
								</CardDescription>
							</CardHeader>
							<CardContent>
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
							</CardContent>
						</Card>
					</div>

					<div className="space-y-8 xl:col-span-4">
						<Card>
							<CardHeader>
								<CardTitle>Configuration</CardTitle>
								<CardDescription>
									Basic settings for your transformation
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-5">
								<div>
									<Label htmlFor="name">
										Name <span className="text-destructive">*</span>
									</Label>
									<Input
										{...register('name')}
										id="name"
										placeholder="Enter configuration name"
									/>
									{errors.name && (
										<p className="text-destructive mt-2 text-sm">
											{errors.name.message}
										</p>
									)}
								</div>
								<div>
									<Label htmlFor="description">Description</Label>
									<Input
										{...register('description')}
										id="description"
										placeholder="Enter description (optional)"
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>JSON Configuration</CardTitle>
								<CardDescription>
									Import/export configuration as JSON
								</CardDescription>
							</CardHeader>
							<CardContent>
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
							</CardContent>
						</Card>
					</div>
				</div>

				<div className="border-t pt-6">
					<div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
						<div className="text-muted-foreground text-sm">
							{uploadedFile ? (
								<span className="flex items-center">
									<span className="bg-success mr-2 h-2 w-2 rounded-full"></span>
									File uploaded: {uploadedFile.name}
								</span>
							) : (
								<span className="flex items-center">
									<span className="bg-muted-foreground mr-2 h-2 w-2 rounded-full"></span>
									No file uploaded
								</span>
							)}
							<span className="text-muted-foreground ml-4">
								{rules.length} transformation rule
								{rules.length !== 1 ? 's' : ''} configured
							</span>
						</div>

						<div className="flex space-x-3">
							<Button type="button" onClick={handleCancel} variant="outline">
								Cancel
							</Button>
							<Button
								type="submit"
								onClick={handleSubmit(onSubmit)}
								disabled={
									createConfiguration.isPending || !formData.name?.trim()
								}
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
