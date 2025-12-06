import { Activity } from 'lucide-react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

import { useUsageHistory } from '@/hooks/use-billing';

const monthNames = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

export function UsageChart() {
	const { data: historyData, isLoading } = useUsageHistory(6);
	const history = historyData?.data || [];

	const chartData = history
		.map((item) => ({
			month: `${monthNames[item.month - 1]} ${item.year}`,
			mutations: item.conversionCount,
			overage: item.overageCount,
		}))
		.reverse();

	const totalMutations = chartData.reduce(
		(sum, item) => sum + item.mutations,
		0,
	);

	const hasOverage = chartData.some((d) => d.overage > 0);

	if (isLoading) {
		return (
			<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border">
				<div className="border-border border-b p-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
							<Activity className="text-primary h-5 w-5" />
						</div>
						<div>
							<h2 className="font-display text-lg font-bold tracking-tight">
								Usage Trend
							</h2>
							<p className="text-muted-foreground text-sm">
								Monthly transformation activity
							</p>
						</div>
					</div>
				</div>
				<div className="p-6">
					<div className="bg-muted/50 h-64 animate-pulse rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="card-shine bg-card border-border relative overflow-hidden rounded-2xl border">
			<div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl" />
			<div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-3xl" />

			<div className="relative">
				<div className="border-border flex items-center justify-between border-b p-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 glow-primary flex h-10 w-10 items-center justify-center rounded-xl">
							<Activity className="text-primary h-5 w-5" />
						</div>
						<div>
							<h2 className="font-display text-lg font-bold tracking-tight">
								Usage Trend
							</h2>
							<p className="text-muted-foreground text-sm">
								Monthly transformation activity
							</p>
						</div>
					</div>

					<div className="text-right">
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
							Total
						</p>
						<p className="font-display text-foreground stat-glow text-3xl font-bold tracking-tight">
							{totalMutations.toLocaleString()}
						</p>
					</div>
				</div>

				<div className="p-6 pt-4">
					<ResponsiveContainer width="100%" height={280}>
						<AreaChart
							data={chartData}
							margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
						>
							<defs>
								<linearGradient id="colorMutations" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
									<stop offset="50%" stopColor="#f59e0b" stopOpacity={0.15} />
									<stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="colorOverage" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
									<stop offset="50%" stopColor="#ef4444" stopOpacity={0.15} />
									<stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
								</linearGradient>
								<filter id="glow">
									<feGaussianBlur stdDeviation="3" result="coloredBlur" />
									<feMerge>
										<feMergeNode in="coloredBlur" />
										<feMergeNode in="SourceGraphic" />
									</feMerge>
								</filter>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="hsl(var(--border))"
								strokeOpacity={0.5}
								vertical={false}
							/>
							<XAxis
								dataKey="month"
								tick={{
									fill: 'hsl(var(--muted-foreground))',
									fontSize: 12,
									fontWeight: 500,
								}}
								tickLine={false}
								axisLine={false}
								dy={10}
							/>
							<YAxis
								tick={{
									fill: 'hsl(var(--muted-foreground))',
									fontSize: 12,
									fontWeight: 500,
								}}
								tickLine={false}
								axisLine={false}
								dx={-10}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: 'hsl(var(--card))',
									border: '1px solid hsl(var(--border))',
									borderRadius: '12px',
									boxShadow:
										'0 10px 40px -10px rgba(0,0,0,0.2), 0 0 20px -5px rgba(245,158,11,0.2)',
									padding: '12px 16px',
								}}
								labelStyle={{
									color: 'hsl(var(--foreground))',
									fontWeight: 600,
									marginBottom: '4px',
								}}
								itemStyle={{
									color: 'hsl(var(--muted-foreground))',
									fontSize: '13px',
								}}
								cursor={{
									stroke: 'hsl(var(--primary))',
									strokeWidth: 1,
									strokeDasharray: '4 4',
								}}
							/>
							<Area
								type="monotone"
								dataKey="mutations"
								stroke="#f59e0b"
								strokeWidth={3}
								fillOpacity={1}
								fill="url(#colorMutations)"
								filter="url(#glow)"
								dot={{
									fill: '#f59e0b',
									strokeWidth: 2,
									stroke: 'hsl(var(--card))',
									r: 4,
								}}
								activeDot={{
									fill: '#f59e0b',
									strokeWidth: 3,
									stroke: 'hsl(var(--card))',
									r: 6,
									filter: 'url(#glow)',
								}}
							/>
							{hasOverage && (
								<Area
									type="monotone"
									dataKey="overage"
									stroke="#ef4444"
									strokeWidth={2}
									fillOpacity={1}
									fill="url(#colorOverage)"
									dot={{
										fill: '#ef4444',
										strokeWidth: 2,
										stroke: 'hsl(var(--card))',
										r: 3,
									}}
								/>
							)}
						</AreaChart>
					</ResponsiveContainer>

					<div className="mt-4 flex items-center justify-center gap-8">
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30" />
							<span className="text-muted-foreground text-sm font-medium">
								Transformations
							</span>
						</div>
						{hasOverage && (
							<div className="flex items-center gap-2">
								<div className="h-3 w-3 rounded-full bg-gradient-to-br from-red-400 to-rose-500 shadow-lg shadow-red-500/30" />
								<span className="text-muted-foreground text-sm font-medium">
									Overage
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
