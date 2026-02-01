import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
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

const chartConfig = {
	mutations: {
		label: 'Transformations',
		color: 'var(--chart-1)',
	},
	overage: {
		label: 'Overage',
		color: 'var(--destructive)',
	},
} satisfies ChartConfig;

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

	const totalMutations = chartData.reduce((sum, item) => sum + item.mutations, 0);

	const hasOverage = chartData.some((d) => d.overage > 0);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Usage Trend</CardTitle>
					<CardDescription>Monthly transformation activity</CardDescription>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[280px] w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Usage Trend</CardTitle>
						<CardDescription>Monthly transformation activity</CardDescription>
					</div>
					<div className="text-right">
						<p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
							Total
						</p>
						<p className="text-2xl font-bold tabular-nums">{totalMutations.toLocaleString()}</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
					<AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value) => value.slice(0, 3)}
						/>
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
						<Area
							type="monotone"
							dataKey="mutations"
							fill="var(--color-mutations)"
							fillOpacity={0.3}
							stroke="var(--color-mutations)"
							strokeWidth={2}
						/>
						{hasOverage && (
							<Area
								type="monotone"
								dataKey="overage"
								fill="var(--color-overage)"
								fillOpacity={0.3}
								stroke="var(--color-overage)"
								strokeWidth={2}
							/>
						)}
						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="text-muted-foreground text-sm">Showing last 6 months</CardFooter>
		</Card>
	);
}
