import { Activity, ArrowUpRight, Sparkles, Zap } from 'lucide-react';

import { useQuotaStatus } from '@/hooks/use-billing';
import { useMutations } from '@/hooks/use-mutations';

import { LatestRuns } from './latest-runs';
import { MutationsList } from './mutations-list';
import { QuotaCard } from './quota-card';
import { UsageChart } from './usage-chart';

function QuickStat({
	label,
	value,
	icon: Icon,
	trend,
}: {
	label: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
	trend?: { value: number; positive: boolean };
}) {
	return (
		<div className="group relative">
			<div className="bg-card/50 hover:bg-card border-border/50 hover:border-primary/20 relative overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
				<div className="bg-primary/5 absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="relative">
					<div className="mb-3 flex items-center justify-between">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
							<Icon className="text-primary h-5 w-5" />
						</div>
						{trend && (
							<div
								className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}
							>
								<ArrowUpRight
									className={`h-3 w-3 ${!trend.positive && 'rotate-90'}`}
								/>
								{trend.value}%
							</div>
						)}
					</div>
					<p className="text-muted-foreground text-sm font-medium tracking-wide">
						{label}
					</p>
					<p className="font-display text-foreground mt-1 text-3xl font-bold tracking-tight">
						{value}
					</p>
				</div>
			</div>
		</div>
	);
}

export function Dashboard() {
	const { data: mutData } = useMutations({ page: 1, limit: 10 });
	const { data: quotaData } = useQuotaStatus();

	const mutations = mutData?.data || [];
	const quota = quotaData?.data;

	const activeMutations = mutations.filter((m) => m.isActive).length;
	const monthlyUsage = quota?.usage?.currentMonth || 0;
	const monthlyLimit = quota?.limits?.monthly || 100;
	const remaining = Math.max(0, monthlyLimit - monthlyUsage);

	return (
		<div className="gradient-mesh grid-pattern space-y-8">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<QuickStat
					label="Total Mutations"
					value={mutations.length}
					icon={Sparkles}
				/>
				<QuickStat
					label="Active Pipelines"
					value={activeMutations}
					icon={Activity}
				/>
				<QuickStat
					label="This Month"
					value={monthlyUsage.toLocaleString()}
					icon={Zap}
				/>
				<QuickStat
					label="Remaining"
					value={remaining.toLocaleString()}
					icon={ArrowUpRight}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<MutationsList />
				</div>
				<div className="space-y-6">
					<QuotaCard />
					<LatestRuns />
				</div>
			</div>

			<UsageChart />
		</div>
	);
}
