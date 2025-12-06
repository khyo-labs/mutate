import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import {
	ArrowRight,
	ChevronRight,
	Clock,
	GitBranch,
	MoreVertical,
	Play,
	Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
			<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border">
				<div className="border-border border-b p-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
							<GitBranch className="text-primary h-5 w-5" />
						</div>
						<div>
							<h2 className="font-display text-lg font-bold tracking-tight">
								Transformation Pipelines
							</h2>
							<p className="text-muted-foreground text-sm">
								Your active data transformations
							</p>
						</div>
					</div>
				</div>
				<div className="p-6">
					<div className="space-y-4">
						{[...Array(3)].map((_, i) => (
							<div
								key={i}
								className="bg-muted/50 h-24 animate-pulse rounded-xl"
								style={{ animationDelay: `${i * 100}ms` }}
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (mutations.length === 0) {
		return (
			<div className="card-shine bg-card border-border relative overflow-hidden rounded-2xl border">
				<div className="absolute inset-0 opacity-30">
					<div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/20 to-transparent blur-3xl" />
					<div className="absolute bottom-1/4 right-1/4 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent blur-3xl" />
				</div>
				<div className="relative p-12 text-center">
					<div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
						<Sparkles className="text-primary h-10 w-10" />
					</div>
					<h3 className="font-display text-foreground mb-2 text-xl font-bold">
						No pipelines yet
					</h3>
					<p className="text-muted-foreground mx-auto mb-6 max-w-sm text-sm">
						Create your first mutation pipeline to start transforming data with
						powerful visual rules
					</p>
					<Link to="/create-mutation">
						<Button className="group gap-2 rounded-xl px-6">
							Create Pipeline
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border">
			<div className="border-border flex items-center justify-between border-b p-6">
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
						<GitBranch className="text-primary h-5 w-5" />
					</div>
					<div>
						<h2 className="font-display text-lg font-bold tracking-tight">
							Transformation Pipelines
						</h2>
						<p className="text-muted-foreground text-sm">
							{mutations.length} pipeline{mutations.length !== 1 && 's'}{' '}
							configured
						</p>
					</div>
				</div>
				<Link to="/mutations">
					<Button variant="ghost" size="sm" className="group gap-1">
						View All
						<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
					</Button>
				</Link>
			</div>

			<div className="divide-border divide-y">
				{mutations.map((mutation, index) => (
					<div
						key={mutation.id}
						className="group relative p-5 transition-colors hover:bg-gradient-to-r hover:from-transparent hover:via-amber-500/[0.02] hover:to-transparent"
						style={{ animationDelay: `${index * 50}ms` }}
					>
						<div className="absolute bottom-0 left-0 top-0 w-1 rounded-r bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />

						<div className="flex items-center justify-between">
							<div className="flex items-start gap-4">
								<div className="relative">
									<div
										className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
											mutation.isActive
												? 'bg-emerald-500/10'
												: 'bg-muted'
										}`}
									>
										<GitBranch
											className={`h-5 w-5 ${
												mutation.isActive
													? 'text-emerald-500'
													: 'text-muted-foreground'
											}`}
										/>
									</div>
									{mutation.isActive && (
										<div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
									)}
								</div>

								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<h3 className="text-foreground font-semibold tracking-tight">
											{mutation.name}
										</h3>
										<Badge
											variant={mutation.isActive ? 'default' : 'secondary'}
											className={`text-[10px] font-medium ${
												mutation.isActive
													? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
													: ''
											}`}
										>
											{mutation.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</div>
									<p className="text-muted-foreground line-clamp-1 max-w-md text-sm">
										{mutation.description || 'No description provided'}
									</p>
									<div className="text-muted-foreground flex items-center gap-4 pt-1 text-xs">
										<span className="bg-muted rounded px-1.5 py-0.5 font-mono">
											v{mutation.version}
										</span>
										<span className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{mutation.updatedAt
												? formatDistanceToNow(new Date(mutation.updatedAt), {
														addSuffix: true,
													})
												: 'Never used'}
										</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
								<Link
									to="/mutations/$mutationId"
									params={{ mutationId: mutation.id }}
								>
									<Button
										size="sm"
										className="gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600"
									>
										<Play className="h-3.5 w-3.5" />
										Run
									</Button>
								</Link>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-40">
										<Link
											to="/mutations/$mutationId/edit"
											params={{ mutationId: mutation.id }}
										>
											<DropdownMenuItem>Edit Pipeline</DropdownMenuItem>
										</Link>
										<Link
											to="/mutations/$mutationId"
											params={{ mutationId: mutation.id }}
										>
											<DropdownMenuItem>View Stats</DropdownMenuItem>
										</Link>
										<DropdownMenuItem className="text-destructive focus:text-destructive">
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
