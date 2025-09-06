import { BarChart3, FileText } from 'lucide-react';
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMutations } from '@/hooks/use-mutations';

type MutationStat = {
	id: string;
	name: string;
	count: number;
	percentage: number;
};

export function MutationBreakdown() {
	const { data: mutData } = useMutations({ page: 1, limit: 100 });

	const mutations = mutData?.data || [];

	// Mock data for demonstration - in real app, this would come from API
	const mockStats: MutationStat[] = mutations.slice(0, 5).map((m) => ({
		id: m.id,
		name: m.name,
		count: Math.floor(Math.random() * 100) + 20,
		percentage: 0,
	}));

	// Calculate percentages
	const totalCount = mockStats.reduce((sum, stat) => sum + stat.count, 0);
	mockStats.forEach((stat) => {
		stat.percentage = totalCount > 0 ? (stat.count / totalCount) * 100 : 0;
	});

	// Sort by count descending
	mockStats.sort((a, b) => b.count - a.count);

	const chartData = mockStats.map((stat) => ({
		name: stat.name.length > 15 ? stat.name.slice(0, 15) + '...' : stat.name,
		runs: stat.count,
	}));

	const showChart = mockStats.length > 3;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BarChart3 className="h-5 w-5" />
					Top Mutations by Usage
				</CardTitle>
			</CardHeader>
			<CardContent>
				{mutations.length === 0 ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No mutation data available
					</div>
				) : showChart ? (
					<div className="space-y-4">
						<ResponsiveContainer width="100%" height={200}>
							<BarChart data={chartData}>
								<XAxis
									dataKey="name"
									tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
									tickLine={false}
									axisLine={false}
									angle={-45}
									textAnchor="end"
									height={60}
								/>
								<YAxis
									tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
								<Bar
									dataKey="runs"
									fill="hsl(var(--primary))"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
						<div className="space-y-2">
							{mockStats.slice(0, 3).map((stat, index) => (
								<div
									key={stat.id}
									className="flex items-center justify-between text-sm"
								>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="h-5 w-5 p-0">
											{index + 1}
										</Badge>
										<span className="text-muted-foreground">{stat.name}</span>
									</div>
									<span className="font-medium">{stat.count} runs</span>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="space-y-3">
						{mockStats.map((stat, index) => (
							<div key={stat.id} className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
											<FileText className="text-primary h-4 w-4" />
										</div>
										<div>
											<p className="text-sm font-medium">{stat.name}</p>
											<p className="text-muted-foreground text-xs">
												{stat.count} runs ({stat.percentage.toFixed(1)}%)
											</p>
										</div>
									</div>
									<Badge variant="secondary" className="text-xs">
										#{index + 1}
									</Badge>
								</div>
								<Progress value={stat.percentage} className="h-2" />
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
