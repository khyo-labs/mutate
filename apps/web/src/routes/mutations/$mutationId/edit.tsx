import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertCircle, Eye, FileText, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { mutApi } from '@/api/mutations';
import { workspaceApi } from '@/api/workspaces';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload } from '@/components/file-upload';
import { JsonConfigPanel } from '@/components/json-config-panel';
import { Layout } from '@/components/layouts';
import { MutationSidebar } from '@/components/mutations/mutation-sidebar';
import { RuleBuilder } from '@/components/rule-builder';
import { SpreadsheetPreview } from '@/components/spreadsheet-preview';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type {
	Configuration,
	OutputValidationConfig,
	TransformationRule,
	UploadedFile,
	Webhook,
} from '@/types';

export const Route = createFileRoute('/mutations/$mutationId/edit')({
	component: ConfigurationEditComponent,
});

type FormData = {
	name: string;
	description: string;
	rules: TransformationRule[];
	webhookUrlId?: string;
	outputValidation?: OutputValidationConfig;
};

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
			outputValidation: undefined,
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

	useEffect(() => {
		if (config && !isWebhooksLoading) {
			reset({
				name: config.name,
				description: config.description || '',
				rules: config.rules,
				webhookUrlId: config.webhookUrlId || '',
				outputValidation: config.outputValidation || undefined,
			});
		}
	}, [config, isWebhooksLoading, reset]);

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

			configurationData.outputFormat = {
				type: 'CSV' as const,
				delimiter: ',',
				encoding: 'UTF-8' as const,
				includeHeaders: true,
			};

			if (data.outputValidation?.enabled) {
				configurationData.outputValidation = data.outputValidation;
			} else {
				configurationData.outputValidation = undefined;
			}

			const updatedConfig = await mutApi.update(mutationId, configurationData);
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
			toast.error('Failed to update configuration', {
				description: error.message,
			});
		},
	});

	function onSubmit(data: FormData) {
		if (!data.rules || data.rules.length === 0) {
			toast.warning('Please add at least one transformation rule before saving.');
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
		outputValidation?: OutputValidationConfig;
	}) {
		setValue('name', importedConfig.name);
		setValue('description', importedConfig.description);
		setValue('rules', importedConfig.rules);
		setValue('outputValidation', importedConfig.outputValidation);
	}

	if (isLoading) {
		return (
			<Layout>
				<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
					<div className="space-y-8 xl:col-span-8">
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-48" />
								<Skeleton className="h-4 w-72" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-24 w-full rounded-lg" />
								<Skeleton className="h-24 w-full rounded-lg" />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-56" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-48 w-full rounded-lg" />
							</CardContent>
						</Card>
					</div>
					<div className="space-y-8 xl:col-span-4">
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-48" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-9 w-full" />
								<Skeleton className="h-9 w-full" />
								<Skeleton className="h-9 w-full" />
							</CardContent>
						</Card>
					</div>
				</div>
			</Layout>
		);
	}

	if (error) {
		return (
			<Layout>
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			</Layout>
		);
	}

	if (!config) {
		return (
			<Layout>
				<div className="py-12 text-center">
					<div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
						<FileText className="text-muted-foreground h-8 w-8" />
					</div>
					<h3 className="text-foreground mb-1 text-lg font-semibold">Mutation not found</h3>
					<p className="text-muted-foreground mb-4 text-sm">
						The configuration you're looking for doesn't exist.
					</p>
					<Button variant="outline" onClick={() => navigate({ to: '/mutations' })}>
						Back to Mutations
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
											<h3 className="text-foreground mb-4 text-lg font-medium">Live Preview</h3>
											<SpreadsheetPreview file={uploadedFile} rules={watchedRules} />
										</TabsContent>
										<TabsContent value="data">
											<h3 className="text-foreground mb-4 text-lg font-medium">Sample Data</h3>
											<FileUpload onFileUploaded={setUploadedFile} currentFile={uploadedFile} />
										</TabsContent>
									</CardContent>
								</Card>
							</Tabs>

							{/* Output Preview Card */}
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
									<CardDescription>Basic settings for your transformation</CardDescription>
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
												<Input {...field} id="name" placeholder="Enter mutation name" />
											)}
										/>
										{errors.name && (
											<p className="text-destructive mt-2 text-sm">{errors.name.message}</p>
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
												const selectValue = field.value ? String(field.value) : undefined;

												return (
													<Select onValueChange={field.onChange} value={selectValue}>
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
											Select a specific webhook URL for this configuration, or leave blank to use
											the organization default.
										</p>
									</div>
								</CardContent>
							</Card>

							{/* Output Validation Card */}
							<Card>
								<CardHeader>
									<CardTitle>Output Validation</CardTitle>
									<CardDescription>
										Validate the output column count after transformation
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<Controller
										name="outputValidation"
										control={control}
										render={({ field }) => {
											const validation = field.value || {
												enabled: false,
												expectedColumnCount: 1,
												notificationEmails: [],
											};

											function handleToggle(enabled: boolean) {
												if (enabled) {
													field.onChange({
														...validation,
														enabled: true,
													});
												} else {
													field.onChange(undefined);
												}
											}

											function handleColumnCountChange(value: string) {
												const num = parseInt(value, 10);
												if (!isNaN(num) && num >= 1) {
													field.onChange({
														...validation,
														expectedColumnCount: num,
													});
												}
											}

											function handleAddEmail(email: string) {
												const trimmed = email.trim();
												if (!trimmed) return;
												const emails = validation.notificationEmails || [];
												if (emails.includes(trimmed)) return;
												field.onChange({
													...validation,
													notificationEmails: [...emails, trimmed],
												});
											}

											function handleRemoveEmail(email: string) {
												const emails = validation.notificationEmails || [];
												field.onChange({
													...validation,
													notificationEmails: emails.filter((e: string) => e !== email),
												});
											}

											return (
												<>
													<div className="flex items-center justify-between">
														<Label htmlFor="outputValidationEnabled">Enable validation</Label>
														<Switch
															id="outputValidationEnabled"
															checked={validation.enabled}
															onCheckedChange={handleToggle}
														/>
													</div>

													{validation.enabled && (
														<>
															<div>
																<Label htmlFor="expectedColumnCount">Expected column count</Label>
																<Input
																	id="expectedColumnCount"
																	type="number"
																	min={1}
																	value={validation.expectedColumnCount}
																	onChange={(e) => handleColumnCountChange(e.target.value)}
																/>
															</div>
															<div>
																<Label>Notification emails</Label>
																<div className="mt-1 flex flex-wrap gap-1.5">
																	{(validation.notificationEmails || []).map((email: string) => (
																		<span
																			key={email}
																			className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
																		>
																			{email}
																			<button
																				type="button"
																				onClick={() => handleRemoveEmail(email)}
																				className="text-muted-foreground hover:text-foreground"
																			>
																				<X className="h-3 w-3" />
																			</button>
																		</span>
																	))}
																</div>
																<Input
																	className="mt-2"
																	type="email"
																	placeholder="Add email addresses to notify"
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') {
																			e.preventDefault();
																			const input = e.currentTarget;
																			handleAddEmail(input.value);
																			input.value = '';
																		}
																	}}
																/>
																<p className="text-muted-foreground mt-1 text-xs">
																	Press Enter to add. Falls back to configuration creator's email if
																	none specified.
																</p>
															</div>
														</>
													)}
												</>
											);
										}}
									/>
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
										outputValidation={watch('outputValidation')}
										onImport={handleImportConfig}
									/>
								</CardContent>
							</Card>

							<MutationSidebar config={config} />
						</div>
					</div>

					{/* Action Bar */}
					<Separator className="my-6" />
					<div>
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
									disabled={isSubmitting || updateConfigurationMutation.isPending}
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
