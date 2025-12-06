import { Crown, Medal, Trophy } from 'lucide-react';

import { useMutations } from '@/hooks/use-mutations';

type MutationStat = {
	id: string;
	name: string;
	count: number;
	percentage: number;
};

function RankBadge({ rank }: { rank: number }) {
	if (rank === 1) {
		return (
			<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
				<Crown className="h-4 w-4 text-white" />
			</div>
		);
	}
	if (rank === 2) {
		return (
			<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-300 to-slate-500 shadow-lg shadow-slate-400/30">
				<Medal className="h-4 w-4 text-white" />
			</div>
		);
	}
	if (rank === 3) {
		return (
			<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg shadow-amber-700/30">
				<Medal className="h-4 w-4 text-white" />
			</div>
		);
	}
	return (
		<div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
			{rank}
		</div>
	);
}

export function MutationBreakdown() {
	const { data: mutData, isLoading } = useMutations({ page: 1, limit: 100 });
	const mutations = mutData?.data || [];

	const mockStats: MutationStat[] = mutations.slice(0, 5).map((m) => ({
		id: m.id,
		name: m.name,
		count: Math.floor(Math.random() * 100) + 20,
		percentage: 0,
	}));

	const totalCount = mockStats.reduce((sum, stat) => sum + stat.count, 0);
	mockStats.forEach((stat) => {
		stat.percentage = totalCount > 0 ? (stat.count / totalCount) * 100 : 0;
	});

	mockStats.sort((a, b) => b.count - a.count);

	if (isLoading) {
		return (
			<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border">
				<div className="p-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
							<Trophy className="text-primary h-5 w-5" />
						</div>
						<div className="bg-muted h-6 w-32 animate-pulse rounded" />
					</div>
					<div className="mt-4 space-y-3">
						{[...Array(3)].map((_, i) => (
							<div
								key={i}
								className="bg-muted/50 h-14 animate-pulse rounded-xl"
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (mutations.length === 0) {
		return (
			<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border p-6">
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
						<Trophy className="text-primary h-5 w-5" />
					</div>
					<h2 className="font-display text-lg font-bold tracking-tight">
						Top Pipelines
					</h2>
				</div>
				<div className="text-muted-foreground py-8 text-center text-sm">
					No pipeline data available
				</div>
			</div>
		);
	}

	return (
		<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border">
			<div className="p-6">
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
						<Trophy className="text-primary h-5 w-5" />
					</div>
					<div>
						<h2 className="font-display text-lg font-bold tracking-tight">
							Top Pipelines
						</h2>
						<p className="text-muted-foreground text-sm">By usage this month</p>
					</div>
				</div>

				<div className="mt-5 space-y-3">
					{mockStats.slice(0, 5).map((stat, index) => (
						<div
							key={stat.id}
							className={`group relative overflow-hidden rounded-xl p-3 transition-all hover:scale-[1.02] ${
								index === 0
									? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent'
									: 'hover:bg-muted/50'
							}`}
						>
							<div className="flex items-center gap-3">
								<RankBadge rank={index + 1} />

								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-2">
										<h3 className="text-foreground truncate text-sm font-medium">
											{stat.name}
										</h3>
										<span className="font-display text-foreground shrink-0 text-sm font-bold">
											{stat.count}
										</span>
									</div>

									<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
										<div
											className={`h-full rounded-full transition-all duration-500 ${
												index === 0
													? 'bg-gradient-to-r from-amber-400 to-orange-500'
													: index === 1
														? 'bg-gradient-to-r from-slate-400 to-slate-500'
														: index === 2
															? 'bg-gradient-to-r from-amber-600 to-amber-700'
															: 'bg-gradient-to-r from-gray-400 to-gray-500'
											}`}
											style={{ width: `${stat.percentage}%` }}
										/>
									</div>

									<p className="text-muted-foreground mt-1 text-xs">
										{stat.percentage.toFixed(1)}% of total runs
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
