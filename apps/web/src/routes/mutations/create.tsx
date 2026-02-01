import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { mutApi } from '@/api/mutations';
import { workspaceApi } from '@/api/workspaces';
import { CsvOutputPreview } from '@/components/csv-output-preview';
import { FileUpload } from '@/components/file-upload';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type {
	Configuration,
	TransformationRule,
	UploadedFile,
	Webhook,
} from '@/types';

export const Route = createFileRoute('/mutations/create')({
	component: CreateMutationComponent,
});

type FormData = {
	name: string;
	description: string;
	rules: TransformationRule[];
	webhookUrlId?: string;
};

function CreateMutationComponent() {
	const navigate = useNavigate();
	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
	const { activeWorkspace } = useWorkspaceStore();

	const { data: webhooks = [] } = useQuery({
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
		formState: { errors },
		watch,
		setValue,
	} = form;

	const watchedName = watch('name');
	const watchedDescription = watch('description');
	const watchedRules = watch('rules');

	const createMutation = useMutation({
		mutationFn: async (data: FormData) => {
			return mutApi.create({
				name: data.name.trim(),
				description: data.description.trim(),
				conversionType: 'XLSX_TO_CSV',
				inputFormat: 'XLSX',
				rules: data.rules,
				outputFormat: {
					type: 'CSV' as const,
					delimiter: ',',
					encoding: 'UTF-8' as const,
					includeHeaders: true,
				},
				...(data.webhookUrlId ? { webhookUrlId: data.webhookUrlId } : {}),
			});
		},
		onSuccess: () => {
			toast.success('Mutation created successfully');
			navigate({ to: '/mutations' });
		},
		onError: (error) => {
			toast.error('Failed to create mutation', {
				description: error.message,
			});
		},
	});

	function onSubmit(data: FormData) {
		if (!data.rules || data.rules.length === 0) {
			toast.warning('Please add at least one transformation rule before creating.');
			return;
		}

		createMutation.mutate(data);
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
		setValue('name', importedConfig.name);
		setValue('description', importedConfig.description);
		setValue('rules', importedConfig.rules);
	}

	return (
		<Layout
			title="Create Mutation"
			description="Design a new data transformation pipeline"
		>
			<Form {...form}>
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
						<div className="space-y-8 xl:col-span-8">
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
												const selectValue = field.value
													? String(field.value)
													: undefined;

												return (
													<Select
														onValueChange={field.onChange}
														value={selectValue}
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
						</div>
					</div>

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
									disabled={createMutation.isPending}
								>
									<Plus className="mr-2 h-4 w-4" />
									{createMutation.isPending
										? 'Creating...'
										: 'Create Mutation'}
								</Button>
							</div>
						</div>
					</div>
				</form>
			</Form>
		</Layout>
	);
}
