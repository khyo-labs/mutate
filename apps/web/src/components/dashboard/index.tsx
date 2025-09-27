import { MutationBreakdown } from './mutation-breakdown';
import { MutationsList } from './mutations-list';
import { QuotaCard } from './quota-card';
import { UsageChart } from './usage-chart';

export function Dashboard() {
	return (
		<div className="space-y-6">
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
