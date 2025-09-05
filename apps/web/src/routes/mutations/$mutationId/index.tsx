import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Calendar, Edit, FileText, User } from 'lucide-react';

import { api } from '@/api/client';
import { Layout } from '@/components/layouts';
import { MutationSidebar } from '@/components/mutations/mutation-sidebar';
import { formatDate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { ApiResponse, Configuration } from '@/types';

export const Route = createFileRoute('/mutations/$mutationId/')({
	component: ConfigurationDetailComponent,
});

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
		enabled: !!mutationId,
	});

	function getRuleTypeLabel(ruleType: string) {
		return ruleType
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/\b\w/g, (l) => l.toUpperCase());
	}

	if (isLoading) {
		return (
			<Layout>
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
						<p className="text-muted-foreground mt-4">Loading mutation...</p>
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
						Mutation not found
					</h2>
					<p className="text-muted-foreground mt-2">
						The mutation you're looking for doesn't exist.
					</p>
					<Link
						to="/mutations"
						className="text-primary mt-4 inline-block hover:underline"
					>
						Back to Mutations
					</Link>
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
							onClick={() => navigate({ to: '/mutations' })}
							className="text-muted-foreground hover:text-foreground flex items-center transition-colors"
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							Back to Mutations
						</button>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-foreground text-3xl font-bold">
								{config.name}
							</h1>
							{config.description && (
								<p className="text-muted-foreground mt-2 text-lg">
									{config.description}
								</p>
							)}
							<div className="text-muted-foreground mt-4 flex items-center space-x-6 text-sm">
								<div className="flex items-center">
									<Calendar className="mr-1 h-4 w-4" />
									Created {formatDate(config.createdAt)}
								</div>
								<div className="flex items-center">
									<Calendar className="mr-1 h-4 w-4" />
									Updated {formatDate(config.updatedAt)}
								</div>
								<div className="flex items-center">
									<User className="mr-1 h-4 w-4" />
									Version {config.version}
								</div>
								<div className="flex items-center">
									<FileText className="mr-1 h-4 w-4" />
									{config.rules.length} rules
								</div>
							</div>
						</div>

						<div className="mt-6 flex flex-col space-y-2 sm:mt-0 sm:flex-row sm:space-x-3 sm:space-y-0">
							<Link
								to="/mutations/$mutationId/edit"
								params={{ mutationId: config.id }}
								className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit Mutation
							</Link>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					{/* Configuration Details */}
					<div className="space-y-6 lg:col-span-2">
						{/* Rules List */}
						<div className="bg-card rounded-lg border p-6">
							<h2 className="text-card-foreground mb-4 text-lg font-medium">
								Transformation Rules
							</h2>
							{config.rules.length > 0 ? (
								<div className="space-y-3">
									{config.rules.map((rule, index) => (
										<div
											key={rule.id}
											className="bg-muted/50 flex items-start space-x-3 rounded-lg border p-3"
										>
											<div className="bg-primary/10 text-primary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
												{index + 1}
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="text-card-foreground text-sm font-medium">
													{getRuleTypeLabel(rule.type)}
												</h3>
												<p className="text-muted-foreground mt-1 text-xs">
													{JSON.stringify(rule.params, null, 2)}
												</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground py-4 text-center">
									No rules configured
								</p>
							)}
						</div>

						{/* Output Format */}
						<div className="bg-card rounded-lg border p-6">
							<h2 className="text-card-foreground mb-4 text-lg font-medium">
								Output Format
							</h2>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Format:</span>
									<span className="text-card-foreground font-medium">
										{config.outputFormat.type}
									</span>
								</div>
								{config.outputFormat.type === 'CSV' && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Delimiter:</span>
										<span className="text-card-foreground font-mono">
											{'delimiter' in config.outputFormat
												? config.outputFormat.delimiter
												: ','}
										</span>
									</div>
								)}
								{config.outputFormat.type === 'CSV' && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Encoding:</span>
										<span className="text-card-foreground font-medium">
											{'encoding' in config.outputFormat
												? config.outputFormat.encoding
												: 'utf-8'}
										</span>
									</div>
								)}
								{config.outputFormat.type === 'CSV' && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Include Headers:
										</span>
										<span className="text-card-foreground font-medium">
											{'includeHeaders' in config.outputFormat
												? config.outputFormat.includeHeaders
													? 'Yes'
													: 'No'
												: 'Yes'}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* API Usage Sidebar */}
					<div className="lg:col-span-1">
						<MutationSidebar config={config} />
					</div>
				</div>
			</div>
		</Layout>
	);
}
