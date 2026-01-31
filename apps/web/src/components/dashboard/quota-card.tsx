import { differenceInDays, format } from 'date-fns';
import { AlertTriangle, Calendar, Gauge, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useQuotaStatus } from '@/hooks/use-billing';

function CircularProgress({
	value,
	max,
	isOverLimit,
}: {
	value: number;
	max: number;
	isOverLimit: boolean;
}) {
	const percentage = Math.min((value / max) * 100, 100);
	const circumference = 2 * Math.PI * 45;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	const getGradientId = () => (isOverLimit ? 'overLimit' : 'normal');

	return (
		<div className="relative inline-flex items-center justify-center">
			<svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
				<defs>
					<linearGradient id="normal" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#f59e0b" />
						<stop offset="100%" stopColor="#ea580c" />
					</linearGradient>
					<linearGradient id="overLimit" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#ef4444" />
						<stop offset="100%" stopColor="#dc2626" />
					</linearGradient>
					<filter id="gaugeGlow">
						<feGaussianBlur stdDeviation="2" result="coloredBlur" />
						<feMerge>
							<feMergeNode in="coloredBlur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<circle
					className="text-muted/30"
					strokeWidth="8"
					stroke="currentColor"
					fill="transparent"
					r="45"
					cx="50"
					cy="50"
				/>
				<circle
					stroke={`url(#${getGradientId()})`}
					strokeWidth="8"
					strokeLinecap="round"
					fill="transparent"
					r="45"
					cx="50"
					cy="50"
					style={{
						strokeDasharray: circumference,
						strokeDashoffset,
						transition: 'stroke-dashoffset 0.5s ease-in-out',
						filter: 'url(#gaugeGlow)',
					}}
				/>
			</svg>
			<div className="absolute flex flex-col items-center justify-center">
				<span className="font-display text-foreground text-2xl font-bold">
					{Math.round(percentage)}%
				</span>
				<span className="text-muted-foreground text-xs">used</span>
			</div>
		</div>
	);
}

export function QuotaCard() {
	const { data: quotaData, isLoading } = useQuotaStatus();
	const quota = quotaData?.data;

	if (isLoading) {
		return (
			<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border">
				<div className="p-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
							<Gauge className="text-primary h-5 w-5" />
						</div>
						<div className="bg-muted h-6 w-32 animate-pulse rounded" />
					</div>
					<div className="mt-6 flex justify-center">
						<div className="bg-muted h-32 w-32 animate-pulse rounded-full" />
					</div>
				</div>
			</div>
		);
	}

	if (!quota) {
		return (
			<div className="card-shine bg-card border-border overflow-hidden rounded-2xl border p-6">
				<div className="text-muted-foreground py-8 text-center text-sm">
					Unable to load usage data
				</div>
			</div>
		);
	}

	const monthlyLimit = quota.limits.monthly;
	const currentUsage = quota.usage.currentMonth;
	const isOverLimit = currentUsage > monthlyLimit;
	const daysRemaining = differenceInDays(
		new Date(quota.periodEnd),
		new Date(),
	);

	return (
		<div className="card-shine bg-card border-border relative overflow-hidden rounded-2xl border">
			{isOverLimit && (
				<div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
			)}

			<div className="relative p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-xl ${
								isOverLimit ? 'bg-red-500/10' : 'bg-primary/10'
							}`}
						>
							<Gauge
								className={`h-5 w-5 ${isOverLimit ? 'text-red-500' : 'text-primary'}`}
							/>
						</div>
						<div>
							<h2 className="font-display text-lg font-bold tracking-tight">
								Usage Quota
							</h2>
							<p className="text-muted-foreground text-sm">
								{quota.subscription?.planName || 'Free Plan'}
							</p>
						</div>
					</div>
					<Badge
						variant="secondary"
						className="bg-primary/10 text-primary border-0 font-medium"
					>
						<Zap className="mr-1 h-3 w-3" />
						{quota.subscription?.planName || 'Free'}
					</Badge>
				</div>

				<div className="mt-6 flex justify-center">
					<CircularProgress
						value={currentUsage}
						max={monthlyLimit}
						isOverLimit={isOverLimit}
					/>
				</div>

				<div className="mt-6 space-y-4">
					<div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-transparent via-amber-500/5 to-transparent px-4 py-3">
						<span className="text-muted-foreground text-sm">
							Monthly Mutations
						</span>
						<span className="font-display text-foreground font-bold">
							{currentUsage.toLocaleString()}{' '}
							<span className="text-muted-foreground font-normal">
								/ {monthlyLimit.toLocaleString()}
							</span>
						</span>
					</div>

					{isOverLimit && (
						<div className="flex items-center gap-3 rounded-xl bg-red-500/10 p-3">
							<AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
							<div className="text-sm">
								<p className="font-medium text-red-500">Quota Exceeded</p>
								<p className="text-muted-foreground">
									{(currentUsage - monthlyLimit).toLocaleString()} over limit
								</p>
							</div>
						</div>
					)}

					<div className="border-border flex items-center justify-between border-t pt-4">
						<div className="flex items-center gap-2 text-sm">
							<Calendar className="text-muted-foreground h-4 w-4" />
							<span className="text-muted-foreground">Resets in</span>
						</div>
						<div className="text-right">
							<span className="font-display text-foreground font-bold">
								{daysRemaining} days
							</span>
							{quota.periodEnd && (
								<p className="text-muted-foreground text-xs">
									{format(new Date(quota.periodEnd), 'MMM dd')}
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
