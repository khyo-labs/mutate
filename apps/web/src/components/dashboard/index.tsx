import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { MutationBreakdown } from './mutation-breakdown';
import { MutationsList } from './mutations-list';
import { QuotaCard } from './quota-card';
import { UsageChart } from './usage-chart';

export function Dashboard() {
	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<h1 className="text-foreground text-3xl font-bold">Dashboard</h1>
				</div>
				<Link to="/create-mutation">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						New Mutation
					</Button>
				</Link>
			</div>

			{/* Mutations List */}
			<MutationsList />

			{/* Usage Chart */}
			<UsageChart />

			{/* Bottom Section - Quota and Breakdown */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<QuotaCard />
				<MutationBreakdown />
			</div>
		</div>
	);
}
