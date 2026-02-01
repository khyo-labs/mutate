import { createFileRoute } from '@tanstack/react-router';
import { Activity, Calendar, CreditCard, Package, TrendingUp, Users } from 'lucide-react';

import { SettingsHeader } from '@/components/settings/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const Route = createFileRoute('/settings/workspace/billing')({
	component: BillingComponent,
});

interface WorkspaceStats {
	currentUsage: number;
	monthlyLimit: number;
	memberCount: number;
	activeApiKeys: number;
	webhooks: number;
	lastActivityAt: string | null;
}

interface SubscriptionInfo {
	plan: {
		id: string;
		name: string;
		price: number;
		conversionLimit: number;
	};
	status: 'active' | 'canceled' | 'past_due' | 'trialing';
	currentPeriodStart: string;
	currentPeriodEnd: string;
	nextBillingDate: string;
}

interface BillingHistory {
	id: string;
	date: string;
	amount: number;
	status: 'paid' | 'pending' | 'failed';
	description: string;
}

function formatDate(dateString: string) {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function formatCurrency(cents: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(cents / 100);
}

function getStatusBadgeVariant(
	status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'active':
		case 'paid':
			return 'default';
		case 'trialing':
		case 'pending':
			return 'secondary';
		case 'canceled':
		case 'past_due':
		case 'failed':
			return 'destructive';
		default:
			return 'outline';
	}
}

function UsageCard({ stats }: { stats: WorkspaceStats }) {
	const usagePercentage = (stats.currentUsage / stats.monthlyLimit) * 100;
	const isNearLimit = usagePercentage > 80;
	const isOverLimit = usagePercentage > 100;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Monthly Usage</span>
					<TrendingUp className="text-muted-foreground h-5 w-5" />
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Transformations this month</span>
						<span className="text-muted-foreground text-sm">
							{stats.currentUsage} / {stats.monthlyLimit}
						</span>
					</div>
					<Progress
						value={Math.min(usagePercentage, 100)}
						className={
							isOverLimit ? '[&>*]:bg-destructive' : isNearLimit ? '[&>*]:bg-yellow-500' : ''
						}
					/>
					{isOverLimit && (
						<p className="text-destructive text-sm">
							You've exceeded your monthly limit. Additional transformations will incur overage
							charges.
						</p>
					)}
					{isNearLimit && !isOverLimit && (
						<p className="text-sm text-yellow-600">You're approaching your monthly limit.</p>
					)}
				</div>

				<div className="grid grid-cols-2 gap-4 pt-4">
					<div>
						<p className="text-muted-foreground text-xs">Members</p>
						<p className="text-2xl font-bold">{stats.memberCount}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Active API Keys</p>
						<p className="text-2xl font-bold">{stats.activeApiKeys}</p>
					</div>
				</div>

				{stats.lastActivityAt && (
					<div className="border-t pt-4">
						<p className="text-muted-foreground text-xs">Last activity</p>
						<p className="text-sm">{formatDate(stats.lastActivityAt)}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Current Plan</span>
					<Package className="text-muted-foreground h-5 w-5" />
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-2xl font-bold">{subscription.plan.name}</h3>
						<p className="text-muted-foreground">{formatCurrency(subscription.plan.price)}/month</p>
					</div>
					<Badge variant={getStatusBadgeVariant(subscription.status)}>
						{subscription.status.charAt(0).toUpperCase() +
							subscription.status.slice(1).replace('_', ' ')}
					</Badge>
				</div>

				<div className="space-y-2 border-t pt-4">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground text-sm">Billing period</span>
						<span className="text-sm">
							{formatDate(subscription.currentPeriodStart)} -{' '}
							{formatDate(subscription.currentPeriodEnd)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground text-sm">Next billing date</span>
						<span className="text-sm">{formatDate(subscription.nextBillingDate)}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground text-sm">Monthly limit</span>
						<span className="text-sm">
							{subscription.plan.conversionLimit.toLocaleString()} transformations
						</span>
					</div>
				</div>

				<div className="flex gap-2 pt-2">
					<Button className="flex-1">Upgrade Plan</Button>
					<Button variant="outline">Manage Subscription</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function BillingHistoryTable({ history }: { history: BillingHistory[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Billing History</span>
					<CreditCard className="text-muted-foreground h-5 w-5" />
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Amount</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Invoice</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{history.map((item) => (
							<TableRow key={item.id}>
								<TableCell>{formatDate(item.date)}</TableCell>
								<TableCell>{item.description}</TableCell>
								<TableCell>{formatCurrency(item.amount)}</TableCell>
								<TableCell>
									<Badge variant={getStatusBadgeVariant(item.status)}>
										{item.status.charAt(0).toUpperCase() + item.status.slice(1)}
									</Badge>
								</TableCell>
								<TableCell className="text-right">
									<Button variant="ghost" size="sm">
										Download
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function LoadingState() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Billing & Usage</h2>
					<p className="text-muted-foreground">
						Manage your subscription and view usage statistics
					</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-16 w-full" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-16 w-full" />
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-64 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}

function BillingComponent() {
	const { activeWorkspace } = useWorkspaceStore();

	// Mock data for now - will be replaced with actual API calls
	const mockStats: WorkspaceStats = {
		currentUsage: 850,
		monthlyLimit: 1000,
		memberCount: 5,
		activeApiKeys: 3,
		webhooks: 2,
		lastActivityAt: new Date().toISOString(),
	};

	const mockSubscription: SubscriptionInfo = {
		plan: {
			id: 'pro',
			name: 'Professional',
			price: 4900,
			conversionLimit: 1000,
		},
		status: 'active',
		currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
		currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
		nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
	};

	const mockHistory: BillingHistory[] = [
		{
			id: '1',
			date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 4900,
			status: 'paid',
			description: 'Professional Plan - Monthly',
		},
		{
			id: '2',
			date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 4900,
			status: 'paid',
			description: 'Professional Plan - Monthly',
		},
		{
			id: '3',
			date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 4900,
			status: 'paid',
			description: 'Professional Plan - Monthly',
		},
	];

	if (!activeWorkspace) {
		return <LoadingState />;
	}

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Billing & Usage"
				description="Manage your subscription and view usage statistics"
			/>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Current Usage</CardTitle>
						<Activity className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{mockStats.currentUsage}</div>
						<p className="text-muted-foreground text-xs">
							of {mockStats.monthlyLimit} transformations
						</p>
						<Progress
							value={(mockStats.currentUsage / mockStats.monthlyLimit) * 100}
							className="mt-2 h-2"
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Team Members</CardTitle>
						<Users className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{mockStats.memberCount}</div>
						<p className="text-muted-foreground text-xs">Active team members</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Next Billing</CardTitle>
						<Calendar className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatCurrency(mockSubscription.plan.price)}</div>
						<p className="text-muted-foreground text-xs">
							{formatDate(mockSubscription.nextBillingDate)}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<UsageCard stats={mockStats} />
				<SubscriptionCard subscription={mockSubscription} />
			</div>

			<BillingHistoryTable history={mockHistory} />

			<Card className="border-muted-foreground/20">
				<CardHeader>
					<CardTitle>Payment Method</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<CreditCard className="h-8 w-8" />
							<div>
								<p className="font-medium">•••• •••• •••• 4242</p>
								<p className="text-muted-foreground text-sm">Expires 12/24</p>
							</div>
						</div>
						<Button variant="outline">Update</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
