import { differenceInDays, format } from 'date-fns';
import { AlertCircle, Calendar, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuotaStatus } from '@/hooks/use-billing';

export function QuotaCard() {
	const { data: quotaData, isLoading } = useQuotaStatus();
	const quota = quotaData?.data;

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Zap className="h-5 w-5" />
						Usage & Plan
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="bg-muted h-20 animate-pulse rounded-lg" />
						<div className="bg-muted h-20 animate-pulse rounded-lg" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!quota) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Zap className="h-5 w-5" />
						Usage & Plan
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground py-4 text-center text-sm">
						Unable to load usage data
					</div>
				</CardContent>
			</Card>
		);
	}

	const monthlyLimit = quota.limits?.monthly || 100;
	const currentUsage = quota.usage?.currentMonth || 0;
	const usagePercentage = Math.min((currentUsage / monthlyLimit) * 100, 100);
	const isOverLimit = currentUsage > monthlyLimit;
	const daysRemaining = quota.periodEnd
		? differenceInDays(new Date(quota.periodEnd), new Date())
		: 30;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Zap className="h-5 w-5" />
						Usage & Plan
					</CardTitle>
					<Badge variant="secondary" className="font-normal">
						{quota.subscription?.plan?.name || 'Free Plan'}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Monthly Mutations</span>
						<span className="font-medium">
							{currentUsage.toLocaleString()} / {monthlyLimit.toLocaleString()}
						</span>
					</div>
					<Progress
						value={usagePercentage}
						className={isOverLimit ? 'bg-destructive/20' : ''}
					/>
					{isOverLimit && (
						<div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-2 text-xs">
							<AlertCircle className="h-3 w-3" />
							<span>
								You've exceeded your monthly limit by{' '}
								{(currentUsage - monthlyLimit).toLocaleString()} mutations
							</span>
						</div>
					)}
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground flex items-center gap-1">
							<Calendar className="h-3 w-3" />
							Billing Period
						</span>
						<span className="text-xs font-medium">
							{daysRemaining} days remaining
						</span>
					</div>
					<div className="text-muted-foreground text-xs">
						{quota.periodEnd &&
							`Resets on ${format(new Date(quota.periodEnd), 'MMM dd, yyyy')}`}
					</div>
				</div>

				{quota?.usage?.currentMonthOverage &&
					quota?.usage?.currentMonthOverage > 0 && (
						<div className="bg-warning/10 text-warning rounded-md p-3">
							<p className="text-xs font-medium">Overage Charges</p>
							<p className="mt-1 text-xs">
								{quota?.usage?.currentMonthOverage} additional mutations used
								this month
							</p>
						</div>
					)}

				<div className="border-t pt-4">
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-muted-foreground text-xs">Mutations Left</p>
							<p className="text-xl font-bold">
								{Math.max(
									0,
									quota.remaining?.monthly || monthlyLimit - currentUsage,
								).toLocaleString()}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Active Jobs</p>
							<p className="text-xl font-bold">
								{quota.usage?.activeConversions || 0} /{' '}
								{quota.limits?.concurrent || 5}
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
