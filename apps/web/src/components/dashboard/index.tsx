import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Building, FileText, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { useSession } from '@/lib/auth-client';

import { RecentMutations } from '../mutations/recent-mutations';

export function Dashboard() {
	const { data: session } = useSession();
	const { data: workspaces } = useListWorkspace();
	console.log('workspaces', workspaces);
	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<h1 className="text-foreground text-3xl font-bold">Dashboard</h1>
					<p className="text-muted-foreground">
						Welcome back, {session?.user?.email || session?.user?.name}
					</p>
				</div>
				<Link to="/mutations/new">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						New Mutation
					</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Recent Mutations</CardTitle>
						<Link
							to="/mutations"
							className="text-primary hover:text-primary/80 inline-flex items-center text-sm font-medium"
						>
							View all
							<ArrowUpRight className="ml-1 h-4 w-4" />
						</Link>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<RecentMutations />
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Link
							to="/mutations/new"
							className="hover:bg-accent flex items-center rounded-lg p-3 text-sm font-medium transition-colors"
						>
							<Plus className="text-muted-foreground mr-3 h-4 w-4" />
							Create new mutation
						</Link>
						<Link
							to="/mutations"
							className="hover:bg-accent flex items-center rounded-lg p-3 text-sm font-medium transition-colors"
						>
							<FileText className="text-muted-foreground mr-3 h-4 w-4" />
							Browse all mutations
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Workspaces</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{workspaces && workspaces[0] && (
							<>
								<div className="flex items-center text-sm">
									<Building className="text-muted-foreground mr-3 h-4 w-4" />
									<span className="text-foreground font-medium">
										{workspaces[0].name}
									</span>
								</div>
								<div className="flex items-center text-sm">
									<Badge variant="secondary">member</Badge>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
