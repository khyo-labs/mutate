import { Link } from '@tanstack/react-router';
import { FileText } from 'lucide-react';

import { useMutations } from '@/hooks/use-mutations';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { NoMutations } from './no-mutations';

export function RecentMutations() {
	const { data: configData } = useMutations({ page: 1, limit: 5 });

	const configurations = configData?.data || [];

	if (configurations?.length === 0) {
		return <NoMutations />;
	}

	return (
		<div className="space-y-3">
			{configurations.map((config) => (
				<div
					key={config.id}
					className="border-border bg-muted/50 flex items-center justify-between rounded-lg border p-4"
				>
					<div className="flex items-center space-x-3">
						<div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
							<FileText className="text-primary h-4 w-4" />
						</div>
						<div>
							<h3 className="text-foreground text-sm font-medium">
								{config.name}
							</h3>
							<p className="text-muted-foreground text-xs">
								{config.description || 'No description'}
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-3">
						<span className="text-muted-foreground text-xs">
							v{config.version}
						</span>
						<Badge variant={config.isActive ? 'default' : 'secondary'}>
							{config.isActive ? 'Active' : 'Inactive'}
						</Badge>
						<Link
							to="/mutations/$configId/edit"
							params={{ configId: config.id }}
						>
							<Button variant="outline" size="sm">
								Edit
							</Button>
						</Link>
					</div>
				</div>
			))}
		</div>
	);
}
