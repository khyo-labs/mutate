import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, ArrowLeft, Calendar, Clock, Edit, FileText, ShieldCheck } from 'lucide-react';

import { api } from '@/api/client';
import { Layout } from '@/components/layouts';
import { MutationSidebar } from '@/components/mutations/mutation-sidebar';
import { RunHistory } from '@/components/mutations/run-history';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getRuleTypeLabel } from '@/lib/format';
import { formatDate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { ApiResponse, Configuration } from '@/types';

export const Route = createFileRoute('/mutations/$mutationId/')({
	component: ConfigurationDetailComponent,
});

function DetailSkeleton() {
	return (
		<Layout>
			<div className="space-y-6">
				<div className="flex flex-wrap items-center gap-4">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-16" />
				</div>
				<div className="grid gap-6 lg:grid-cols-3">
					<div className="space-y-6 lg:col-span-2">
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-4 w-56" />
							</CardHeader>
							<CardContent className="space-y-3">
								{[...Array(3)].map((_, i) => (
									<div key={i} className="flex items-start gap-3 rounded-lg border p-3">
										<Skeleton className="h-6 w-6 rounded-full" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-48" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-28" />
							</CardHeader>
							<CardContent className="space-y-3">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
							</CardContent>
						</Card>
					</div>
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-4 w-48" />
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-20 w-full rounded-lg" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-40 w-full rounded-lg" />
						</CardContent>
					</Card>
				</div>
			</div>
		</Layout>
	);
}

export function ConfigurationDetailComponent() {
	const { mutationId } = Route.useParams();
	const navigate = useNavigate();
	const { activeWorkspace } = useWorkspaceStore();
	const {
		data: config,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['mutations', mutationId],
		queryFn: async () => {
			const response = await api.get<ApiResponse<Configuration>>(
				`/v1/workspace/${activeWorkspace?.id}/configuration/${mutationId}`,
			);
			if (!response.success) {
				throw new Error(response.error.message);
			}
			return response.data;
		},
		enabled: !!mutationId && !!activeWorkspace,
	});

	if (isLoading) {
		return <DetailSkeleton />;
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
						The mutation you're looking for doesn't exist.
					</p>
					<Button variant="outline" asChild>
						<Link to="/mutations">Back to Mutations</Link>
					</Button>
				</div>
			</Layout>
		);
	}

	return (
		<Layout
			title={config.name}
			description={config.description || undefined}
			buttons={[
				<Button
					key="back"
					variant="outline"
					size="sm"
					onClick={() => navigate({ to: '/mutations' })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>,
				<Button key="edit" asChild>
					<Link to="/mutations/$mutationId/edit" params={{ mutationId: config.id }}>
						<Edit className="mr-2 h-4 w-4" />
						Edit Mutation
					</Link>
				</Button>,
			]}
		>
			<div className="space-y-6">
				<div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
					<span className="flex items-center gap-1.5">
						<Calendar className="h-3.5 w-3.5" />
						Created {formatDate(config.createdAt)}
					</span>
					<Separator orientation="vertical" className="h-4" />
					<span className="flex items-center gap-1.5">
						<Clock className="h-3.5 w-3.5" />
						Updated{' '}
						{formatDistanceToNow(new Date(config.updatedAt), {
							addSuffix: true,
						})}
					</span>
					<Separator orientation="vertical" className="h-4" />
					<Badge variant="secondary" className="font-mono">
						v{config.version}
					</Badge>
					<Separator orientation="vertical" className="h-4" />
					<span className="flex items-center gap-1.5">
						<FileText className="h-3.5 w-3.5" />
						{config.rules.length} rules
					</span>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					<div className="space-y-6 lg:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>Operations</CardTitle>
								<CardDescription>Mutation steps applied in order</CardDescription>
							</CardHeader>
							<CardContent>
								{config.rules.length > 0 ? (
									<div className="space-y-3">
										{config.rules.map((rule, index) => (
											<div
												key={rule.id}
												className="bg-muted/50 flex items-start gap-3 rounded-lg border p-3"
											>
												<div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
													{index + 1}
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-foreground text-sm font-medium">
														{getRuleTypeLabel(rule.type)}
													</p>
													<pre className="text-muted-foreground mt-1 overflow-x-auto font-mono text-xs">
														{JSON.stringify(rule.params, null, 2)}
													</pre>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="text-muted-foreground py-8 text-center text-sm">
										No rules configured
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Output Format</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Format</span>
										<span className="text-foreground font-medium">{config.outputFormat.type}</span>
									</div>
									{config.outputFormat.type === 'CSV' && (
										<>
											<Separator />
											<div className="flex justify-between">
												<span className="text-muted-foreground">Delimiter</span>
												<span className="text-foreground font-mono">
													{'delimiter' in config.outputFormat ? config.outputFormat.delimiter : ','}
												</span>
											</div>
											<Separator />
											<div className="flex justify-between">
												<span className="text-muted-foreground">Encoding</span>
												<span className="text-foreground font-medium">
													{'encoding' in config.outputFormat
														? config.outputFormat.encoding
														: 'utf-8'}
												</span>
											</div>
											<Separator />
											<div className="flex justify-between">
												<span className="text-muted-foreground">Include Headers</span>
												<span className="text-foreground font-medium">
													{'includeHeaders' in config.outputFormat
														? config.outputFormat.includeHeaders
															? 'Yes'
															: 'No'
														: 'Yes'}
												</span>
											</div>
										</>
									)}
								</div>
							</CardContent>
						</Card>

						{config.outputValidation?.enabled && (
							<Card>
								<CardHeader>
									<div className="flex items-center gap-2">
										<ShieldCheck className="h-4 w-4" />
										<CardTitle>Output Validation</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Status</span>
											<Badge variant="secondary">Enabled</Badge>
										</div>
										<Separator />
										<div className="flex justify-between">
											<span className="text-muted-foreground">Expected Column Count</span>
											<span className="text-foreground font-medium">
												{config.outputValidation.expectedColumnCount}
											</span>
										</div>
										{config.outputValidation.notificationEmails &&
											config.outputValidation.notificationEmails.length > 0 && (
												<>
													<Separator />
													<div>
														<span className="text-muted-foreground">Notification Emails</span>
														<div className="mt-1.5 flex flex-wrap gap-1">
															{config.outputValidation.notificationEmails.map((email) => (
																<Badge key={email} variant="outline" className="font-normal">
																	{email}
																</Badge>
															))}
														</div>
													</div>
												</>
											)}
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					<div className="lg:col-span-1">
						<MutationSidebar config={config} showConfig />
					</div>
				</div>

				<RunHistory configurationId={config.id} />
			</div>
		</Layout>
	);
}
