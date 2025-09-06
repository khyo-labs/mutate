import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import {
	Activity,
	ChevronRight,
	FileText,
	MoreVertical,
	Play,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMutations } from '@/hooks/use-mutations';

export function MutationsList() {
	const { data: mutData, isLoading } = useMutations({ page: 1, limit: 10 });
	const mutations = mutData?.data || [];

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Workspace Mutations
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[...Array(3)].map((_, i) => (
							<div
								key={i}
								className="bg-muted h-16 animate-pulse rounded-lg"
							/>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (mutations.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Workspace Mutations
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground py-8 text-center">
						<FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
						<p className="mb-2 text-sm font-medium">No mutations yet</p>
						<p className="text-xs">
							Create your first mutation to start transforming files
						</p>
						<Link to="/create-mutation">
							<Button size="sm" className="mt-4">
								Create Mutation
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Workspace Mutations
					</CardTitle>
					<Link to="/mutations">
						<Button variant="ghost" size="sm">
							View All
							<ChevronRight className="ml-1 h-4 w-4" />
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{mutations.map((mutation) => (
						<div
							key={mutation.id}
							className="bg-muted/30 hover:bg-muted/50 group flex items-center justify-between rounded-lg border p-4 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-md">
									<FileText className="text-primary h-5 w-5" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="text-foreground font-medium">
											{mutation.name}
										</h3>
										<Badge
											variant={mutation.isActive ? 'default' : 'secondary'}
											className="text-xs"
										>
											{mutation.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</div>
									<p className="text-muted-foreground mt-0.5 text-sm">
										{mutation.description || 'No description'}
									</p>
									<div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
										<span>v{mutation.version}</span>
										<span>•</span>
										<span className="flex items-center gap-1">
											<Activity className="h-3 w-3" />
											Last used{' '}
											{mutation.updatedAt
												? formatDistanceToNow(new Date(mutation.updatedAt), {
														addSuffix: true,
													})
												: 'never'}
										</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Link
									to="/mutations/$mutationId"
									params={{ mutationId: mutation.id }}
								>
									<Button
										variant="ghost"
										size="sm"
										className="opacity-0 transition-opacity group-hover:opacity-100"
									>
										<Play className="mr-1 h-3 w-3" />
										Run
									</Button>
								</Link>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<Link
											to="/mutations/$mutationId/edit"
											params={{ mutationId: mutation.id }}
										>
											<DropdownMenuItem>Edit</DropdownMenuItem>
										</Link>
										<Link
											to="/mutations/$mutationId"
											params={{ mutationId: mutation.id }}
										>
											<DropdownMenuItem>View Stats</DropdownMenuItem>
										</Link>
										<DropdownMenuItem className="text-destructive">
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
