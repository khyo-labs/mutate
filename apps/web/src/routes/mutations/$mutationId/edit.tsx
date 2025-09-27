import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Eye, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { mutApi } from '@/api/mutations';
import { workspaceApi } from '@/api/workspaces';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload } from '@/components/file-upload';
import { JsonConfigPanel } from '@/components/json-config-panel';
import { Layout } from '@/components/layouts';
import { MutationSidebar } from '@/components/mutations/mutation-sidebar';
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
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type {
	Configuration,
	TransformationRule,
	UploadedFile,
	Webhook,
} from '@/types';

export const Route = createFileRoute('/mutations/$mutationId/edit')({
	component: ConfigurationEditComponent,
});

interface FormData {
	name: string;
	description: string;
	rules: TransformationRule[];
	webhookUrlId?: string;
}

export function ConfigurationEditComponent() {
	const { mutationId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

	const {
		data: config,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['mutations', mutationId],
		queryFn: async () => mutApi.get(mutationId),
		enabled: !!mutationId,
	});

	const { activeWorkspace } = useWorkspaceStore();

	const { data: webhooks = [], isLoading: isWebhooksLoading } = useQuery({
		queryKey: ['workspace', 'webhooks', activeWorkspace?.id],
		queryFn: async () => workspaceApi.getWebhooks(activeWorkspace!.id),
		enabled: !!activeWorkspace,
	});

	const form = useForm<FormData>({
		defaultValues: {
			name: '',
			description: '',
			rules: [],
			webhookUrlId: '',
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

	const watchedName = watch('name');
	const watchedDescription = watch('description');
	const watchedRules = watch('rules');
	const watchedWebhookUrlId = watch('webhookUrlId');

	useEffect(() => {
		if (config) {
			console.log('Config loaded:', config);
			console.log('Config webhookUrlId:', config.webhookUrlId);
			console.log('Webhooks loading:', isWebhooksLoading);
			console.log('Available webhooks:', webhooks);

			if (!isWebhooksLoading) {
				console.log(
					'Setting form values with webhookUrlId:',
					config.webhookUrlId,
				);

				reset({
					name: config.name,
					description: config.description || '',
					rules: config.rules,
					webhookUrlId: config.webhookUrlId || '',
				});

				// Force set the webhook value after a small delay to ensure form is ready
				if (config.webhookUrlId) {
					setTimeout(() => {
						console.log('Force setting webhookUrlId to:', config.webhookUrlId);
						setValue('webhookUrlId', config.webhookUrlId!);
					}, 100);
				}
			}
		}
	}, [config, isWebhooksLoading, webhooks, reset, setValue]);

	const updateConfigurationMutation = useMutation({
		mutationFn: async (data: FormData) => {
			const configurationData: Partial<Configuration> = {};

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
			};

			console.log('Sending update request:', configurationData);

			const updatedConfig = await mutApi.update(mutationId, configurationData);

			console.log('Update response:', updatedConfig);

			return updatedConfig;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['configurations'] });
			queryClient.invalidateQueries({
				queryKey: ['configurations', mutationId],
			});
			navigate({
				to: '/mutations/$mutationId',
				params: { mutationId: mutationId },
			});
		},
		onError: (error) => {
			console.error('Failed to update configuration:', error);
			console.error('Error details:', error);
			alert(`Failed to update configuration: ${error.message}`);
		},
	});

	function onSubmit(data: FormData) {
		// Validate that we have at least one rule
		if (!data.rules || data.rules.length === 0) {
			alert('Please add at least one transformation rule before saving.');
			return;
		}

		updateConfigurationMutation.mutate(data);
	}

	function handleCancel() {
		navigate({ to: '/mutations/$mutationId', params: { mutationId } });
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
		<Layout
			title="Edit Mutation"
			description="Modify your data transformation mutation"
			buttons={[
				<Button
					variant="outline"
					onClick={() =>
						navigate({
							to: '/mutations/$mutationId',
							params: { mutationId },
						})
					}
				>
					<Eye className="mr-2 h-4 w-4" />
					Preview
				</Button>,
			]}
		>
			<Form {...form}>
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Main Content Grid */}
					<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
						{/* Left Column - Main Content Area */}
						<div className="space-y-8 xl:col-span-8">
							{/* Transformation Rules Card - Larger Space */}
							<Card>
								<CardHeader>
									<CardTitle>Transformation Rules</CardTitle>
									<CardDescription>
										Build your data transformation pipeline step by step
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Controller
										name="rules"
										control={control}
										render={({ field: { onChange, value } }) => (
											<RuleBuilder rules={value} onChange={onChange} />
										)}
									/>
								</CardContent>
							</Card>

							{/* Data Preview Tabs */}
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
											<SpreadsheetPreview
												file={uploadedFile}
												rules={watchedRules}
											/>
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

							{/* Output Preview Card */}
							<Card>
								<CardHeader>
									<CardTitle>Output Preview</CardTitle>
									<CardDescription>
										Preview the final CSV output with your transformations
										applied
									</CardDescription>
								</CardHeader>
								<CardContent>
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
								</CardContent>
							</Card>
						</div>

						{/* Right Column - Configuration Sidebar */}
						<div className="space-y-8 xl:col-span-4">
							{/* Configuration Details Card */}
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
										<Controller
											name="name"
											control={control}
											rules={{ required: 'Mutation name is required' }}
											render={({ field }) => (
												<Input
													{...field}
													id="name"
													placeholder="Enter mutation name"
												/>
											)}
										/>
										{errors.name && (
											<p className="text-destructive mt-2 text-sm">
												{errors.name.message}
											</p>
										)}
									</div>
									<div>
										<Label htmlFor="description">Description</Label>
										<Controller
											name="description"
											control={control}
											render={({ field }) => (
												<Input
													{...field}
													id="description"
													placeholder="Enter description (optional)"
												/>
											)}
										/>
									</div>
									<div>
										<Label htmlFor="webhookUrlId">Webhook URL</Label>
										<Controller
											name="webhookUrlId"
											control={control}
											render={({ field }) => {
												console.log(
													'Rendering Select with value:',
													field.value,
												);
												console.log(
													'Current watched webhookUrlId:',
													watchedWebhookUrlId,
												);
												console.log(
													'Available webhook IDs:',
													webhooks.map((w) => w.id),
												);

												// Ensure value is a string or undefined
												const selectValue = field.value
													? String(field.value)
													: undefined;

												return (
													<Select
														onValueChange={(value) => {
															console.log(
																'Select onChange called with:',
																value,
															);
															field.onChange(value);
														}}
														value={selectValue}
														defaultValue={selectValue}
													>
														<SelectTrigger>
															<SelectValue placeholder="Use organization default" />
														</SelectTrigger>
														<SelectContent>
															{webhooks.map((webhook: Webhook) => (
																<SelectItem key={webhook.id} value={webhook.id}>
																	{webhook.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												);
											}}
										/>
										<p className="text-muted-foreground mt-1 text-xs">
											Select a specific webhook URL for this configuration, or
											leave blank to use the organization default.
										</p>
									</div>
								</CardContent>
							</Card>

							{/* JSON Configuration Card */}
							<Card>
								<CardHeader>
									<CardTitle>JSON Configuration</CardTitle>
								</CardHeader>
								<CardContent>
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
								</CardContent>
							</Card>

							{/* API Usage Sidebar */}
							<Card>
								<CardHeader>
									<CardTitle>API Usage</CardTitle>
									<CardDescription>
										Integration details and usage
									</CardDescription>
								</CardHeader>
								<CardContent>
									<MutationSidebar config={config} />
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Action Bar */}
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
								{/* Rules count */}
								<span className="text-muted-foreground ml-4">
									{watchedRules.length} transformation rule
									{watchedRules.length !== 1 ? 's' : ''} configured
								</span>
							</div>

							<div className="flex space-x-3">
								<Button type="button" variant="outline" onClick={handleCancel}>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										isSubmitting || updateConfigurationMutation.isPending
									}
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
			</Form>
		</Layout>
	);
}
