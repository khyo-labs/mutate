import { Link } from '@tanstack/react-router';
import { Activity, ChevronRight, Sparkles, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuotaStatus } from '@/hooks/use-billing';
import { useMutations } from '@/hooks/use-mutations';

import { LatestRuns } from './latest-runs';
import { MutationsList } from './mutations-list';
import { QuotaCard } from './quota-card';
import { UsageChart } from './usage-chart';

function StatCard({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
}) {
	return (
		<Card>
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardAction>
					<Icon className="text-muted-foreground h-4 w-4" />
				</CardAction>
				<CardTitle className="text-2xl font-bold tabular-nums">{value}</CardTitle>
			</CardHeader>
		</Card>
	);
}

export function Dashboard() {
	const { data: mutData } = useMutations({ page: 1, limit: 10 });
	const { data: quotaData } = useQuotaStatus();

	const mutations = mutData?.data || [];
	const quota = quotaData?.data;

	const activeMutations = mutations.filter((m) => m.isActive).length;
	const monthlyUsage = quota?.usage?.currentMonth || 0;

	return (
		<div className="space-y-6">
			<div className="grid gap-4 lg:grid-cols-4">
				<div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
					<StatCard label="Total Mutations" value={mutations.length} icon={Sparkles} />
					<StatCard label="Active Mutations" value={activeMutations} icon={Activity} />
					<StatCard label="This Month" value={monthlyUsage.toLocaleString()} icon={Zap} />
				</div>
				<QuotaCard />
			</div>

			<div className="grid gap-6 lg:grid-cols-5">
				<div className="lg:col-span-3">
					<UsageChart />
				</div>
				<div className="lg:col-span-2">
					<Card className="flex flex-col">
						<CardHeader>
							<CardTitle>Activity</CardTitle>
							<CardAction>
								<Link to="/mutations">
									<Button variant="ghost" size="sm" className="gap-1">
										View All
										<ChevronRight className="h-4 w-4" />
									</Button>
								</Link>
							</CardAction>
						</CardHeader>
						<CardContent className="flex-1 p-0">
							<Tabs defaultValue="runs">
								<div className="px-6">
									<TabsList className="w-full">
										<TabsTrigger value="runs">Recent Runs</TabsTrigger>
										<TabsTrigger value="pipelines">Mutations</TabsTrigger>
									</TabsList>
								</div>
								<TabsContent value="runs" className="mt-0">
									<LatestRuns />
								</TabsContent>
								<TabsContent value="pipelines" className="mt-0">
									<MutationsList />
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
