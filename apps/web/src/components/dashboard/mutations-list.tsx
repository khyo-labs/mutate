import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import {
	ArrowRight,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useMutations } from '@/hooks/use-mutations';

export function MutationsList() {
	const { data: mutData, isLoading } = useMutations({ page: 1, limit: 10 });
	const mutations = mutData?.data || [];

	if (isLoading) {
		return (
			<div className="space-y-3 p-1">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="flex items-center gap-3 p-3">
						<Skeleton className="h-10 w-10 rounded-lg" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (mutations.length === 0) {
		return (
			<div className="py-12 text-center">
				<div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
					<Sparkles className="text-muted-foreground h-8 w-8" />
				</div>
				<h3 className="text-foreground mb-1 font-semibold">
					No pipelines yet
				</h3>
				<p className="text-muted-foreground mx-auto mb-4 max-w-xs text-sm">
					Create your first mutation pipeline to start transforming data
				</p>
				<Link to="/create-mutation">
					<Button size="sm" className="gap-2">
						Create Pipeline
						<ArrowRight className="h-4 w-4" />
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="divide-border divide-y">
			{mutations.map((mutation) => (
				<div
					key={mutation.id}
					className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
				>
					<div className="flex min-w-0 items-center gap-3">
						<div
							className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
								mutation.isActive ? 'bg-emerald-500/10' : 'bg-muted'
							}`}
						>
							<GitBranch
								className={`h-4 w-4 ${
									mutation.isActive
										? 'text-emerald-500'
										: 'text-muted-foreground'
								}`}
							/>
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-foreground truncate text-sm font-medium">
									{mutation.name}
								</span>
								<Badge
									variant={mutation.isActive ? 'default' : 'secondary'}
									className={
										mutation.isActive
											? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
											: ''
									}
								>
									{mutation.isActive ? 'Active' : 'Inactive'}
								</Badge>
							</div>
							<div className="text-muted-foreground flex items-center gap-3 text-xs">
								<span className="font-mono">v{mutation.version}</span>
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

					<div className="flex shrink-0 items-center gap-1">
						<Link
							to="/mutations/$mutationId"
							params={{ mutationId: mutation.id }}
						>
							<Button size="sm" variant="ghost" className="h-8 gap-1.5">
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
			))}
		</div>
	);
}
