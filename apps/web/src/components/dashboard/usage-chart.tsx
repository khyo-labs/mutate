import { TrendingUp } from 'lucide-react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

	console.log(chartData);

	const totalMutations = chartData.reduce(
		(sum, item) => sum + item.mutations,
		0,
	);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						Mutation Usage Trend
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="bg-muted h-64 animate-pulse rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						Mutation Usage Trend
					</CardTitle>
					<div className="text-right">
						<p className="text-muted-foreground text-sm">Total Mutations</p>
						<p className="text-2xl font-bold">{totalMutations}</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<AreaChart
						data={chartData}
						margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
					>
						<defs>
							<linearGradient id="colorMutations" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="hsl(var(--primary))"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--primary))"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id="colorOverage" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="hsl(var(--destructive))"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--destructive))"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							className="stroke-muted"
							vertical={false}
						/>
						<XAxis
							dataKey="month"
							className="text-xs"
							tick={{ fill: 'hsl(var(--muted-foreground))' }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							className="text-xs"
							tick={{ fill: 'hsl(var(--muted-foreground))' }}
							tickLine={false}
							axisLine={false}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: 'hsl(var(--background))',
								border: '1px solid hsl(var(--border))',
								borderRadius: '6px',
							}}
							labelStyle={{ color: 'hsl(var(--foreground))' }}
						/>
						<Area
							type="monotone"
							dataKey="mutations"
							stroke="hsl(var(--primary))"
							fillOpacity={1}
							fill="url(#colorMutations)"
							strokeWidth={2}
						/>
						{chartData.some((d) => d.overage > 0) && (
							<Area
								type="monotone"
								dataKey="overage"
								stroke="hsl(var(--destructive))"
								fillOpacity={1}
								fill="url(#colorOverage)"
								strokeWidth={2}
							/>
						)}
					</AreaChart>
				</ResponsiveContainer>
				<div className="mt-4 flex items-center justify-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<div className="bg-primary h-3 w-3 rounded-full" />
						<span className="text-muted-foreground">Regular Usage</span>
					</div>
					{chartData.some((d) => d.overage > 0) && (
						<div className="flex items-center gap-2">
							<div className="bg-destructive h-3 w-3 rounded-full" />
							<span className="text-muted-foreground">Overage</span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
