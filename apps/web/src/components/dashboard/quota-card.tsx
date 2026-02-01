import { differenceInDays, format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuotaStatus } from '@/hooks/use-billing';

export function QuotaCard() {
	const { data: quotaData, isLoading } = useQuotaStatus();
	const quota = quotaData?.data;

	if (isLoading) {
		return (
			<Card className="flex flex-col justify-between">
				<CardHeader className="pb-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-7 w-32" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-2 w-full" />
					<div className="flex justify-between">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-24" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!quota) {
		return (
			<Card className="flex flex-col justify-between">
				<CardContent className="py-6">
					<p className="text-muted-foreground text-center text-sm">Unable to load usage data</p>
				</CardContent>
			</Card>
		);
	}

	const monthlyLimit = quota.limits.monthly;
	const currentUsage = quota.usage.currentMonth;
	const isOverLimit = currentUsage > monthlyLimit;
	const percentage = Math.min((currentUsage / monthlyLimit) * 100, 100);
	const remaining = Math.max(0, monthlyLimit - currentUsage);
	const daysRemaining = differenceInDays(new Date(quota.periodEnd), new Date());

	return (
		<Card className="flex flex-col justify-between">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardDescription>Monthly Usage</CardDescription>
					<Badge variant="secondary">{quota.subscription?.planName || 'Free'}</Badge>
				</div>
				<CardTitle className="text-2xl font-bold">
					{currentUsage.toLocaleString()}
					<span className="text-muted-foreground text-sm font-normal">
						{' '}
						/ {monthlyLimit.toLocaleString()}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<Progress
					value={percentage}
					className={isOverLimit ? '[&>[data-slot=progress-indicator]]:bg-destructive' : ''}
				/>
				<div className="text-muted-foreground flex justify-between text-xs">
					<span>{remaining.toLocaleString()} remaining</span>
					<span>
						Resets {format(new Date(quota.periodEnd), 'MMM dd')} ({daysRemaining}d)
					</span>
				</div>
				{isOverLimit && (
					<div className="text-destructive flex items-center gap-2 text-xs">
						<AlertTriangle className="h-3 w-3" />
						{(currentUsage - monthlyLimit).toLocaleString()} over limit
					</div>
				)}
			</CardContent>
		</Card>
	);
}
