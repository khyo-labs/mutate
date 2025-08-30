import { createFileRoute } from '@tanstack/react-router';
import {
	Activity,
	AlertCircle,
	ChevronRight,
	CreditCard,
	DollarSign,
	FileText,
	Loader2,
	Search,
	Settings,
	Users,
	X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { toast } from 'sonner';

import type { ApiSuccessResponse } from '@/types';

import { api } from '../api/client';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../components/ui/select';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '../components/ui/tabs';
import { useSession } from '../stores/auth-store';

export const Route = createFileRoute('/admin')({
	component: AdminDashboard,
});

interface SubscriptionPlan {
	id: string;
	name: string;
	monthlyConversionLimit: number | null;
	concurrentConversionLimit: number | null;
	maxFileSizeMb: number | null;
	priceCents: number;
	billingInterval: string;
	overagePriceCents: number | null;
	features: any;
}

type Subscription = {
	id: string;
	planId: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	overrideMonthlyLimit: number | null;
	overrideConcurrentLimit: number | null;
	overrideMaxFileSizeMb: number | null;
	overrideOveragePriceCents: number | null;
};

interface Organization {
	id: string;
	name: string;
	slug?: string;
	createdAt: string;
	subscription: Subscription | null;
	plan: SubscriptionPlan | null;
	currentUsage: number;
	overageCount: number;
}

interface UsageHistory {
	month: number;
	year: number;
	conversionCount: number;
	overageCount: number;
	conversionTypeBreakdown: Record<string, number>;
}

function AdminDashboard() {
	const { data: session } = useSession();
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
	const [orgUsageHistory, setOrgUsageHistory] = useState<UsageHistory[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterPlan, setFilterPlan] = useState<string>('all');
	const [view, setView] = useState<'grid' | 'list'>('grid');
	const [editingSubscription, setEditingSubscription] = useState(false);
	const [newPlanId, setNewPlanId] = useState<string>('');
	const [overrides, setOverrides] = useState({
		monthlyConversionLimit: '',
		concurrentConversionLimit: '',
		maxFileSizeMb: '',
		overagePriceCents: '',
	});

	useEffect(() => {
		fetchOrganizations();
		fetchPlans();
	}, []);

	useEffect(() => {
		if (selectedOrg) {
			fetchOrgUsageHistory(selectedOrg.id);
		}
	}, [selectedOrg]);

	async function fetchOrganizations() {
		try {
			const response = await api.get<ApiSuccessResponse<Organization[]>>(
				'/v1/billing/admin/organizations',
			);
			setOrganizations(response.data);
		} catch (error: any) {
			if (error.response?.status === 403) {
				toast.error('You do not have admin access');
			} else {
				toast.error('Failed to fetch organizations');
			}
		} finally {
			setLoading(false);
		}
	}

	async function fetchPlans() {
		try {
			const response =
				await api.get<ApiSuccessResponse<SubscriptionPlan[]>>(
					'/v1/billing/plans',
				);
			setPlans(response.data);
		} catch (error) {
			console.error('Failed to fetch plans:', error);
		}
	}

	async function fetchOrgUsageHistory(orgId: string) {
		try {
			const response = await api.get<ApiSuccessResponse<Organization>>(
				`/v1/billing/admin/organizations/${orgId}`,
			);
			if (response.success) {
				// Fetch usage history - this would need a new endpoint
				// For now, we'll use mock data
				const mockHistory: UsageHistory[] = [
					{
						month: 1,
						year: 2024,
						conversionCount: 45,
						overageCount: 0,
						conversionTypeBreakdown: { XLSX_TO_CSV: 45 },
					},
					{
						month: 2,
						year: 2024,
						conversionCount: 78,
						overageCount: 0,
						conversionTypeBreakdown: { XLSX_TO_CSV: 78 },
					},
					{
						month: 3,
						year: 2024,
						conversionCount: 102,
						overageCount: 2,
						conversionTypeBreakdown: { XLSX_TO_CSV: 102 },
					},
				];
				setOrgUsageHistory(mockHistory);
			}
		} catch (error) {
			console.error('Failed to fetch organization details:', error);
		}
	}

	async function updateSubscriptionPlan(orgId: string, planId: string) {
		try {
			const response = await api.post<ApiSuccessResponse<Subscription>>(
				`/v1/billing/admin/organizations/${orgId}/subscription`,
				{
					planId,
				},
			);

			if (response.success) {
				toast.success('Subscription updated successfully');
				setEditingSubscription(false);
				setNewPlanId('');
				fetchOrganizations();
			}
		} catch (error) {
			toast.error('Failed to update subscription');
		}
	}

	async function saveOverrides(orgId: string) {
		try {
			const payload: any = {};
			if (overrides.monthlyConversionLimit) {
				payload.monthlyConversionLimit = parseInt(
					overrides.monthlyConversionLimit,
				);
			}
			if (overrides.concurrentConversionLimit) {
				payload.concurrentConversionLimit = parseInt(
					overrides.concurrentConversionLimit,
				);
			}
			if (overrides.maxFileSizeMb) {
				payload.maxFileSizeMb = parseInt(overrides.maxFileSizeMb);
			}
			if (overrides.overagePriceCents) {
				payload.overagePriceCents = parseInt(overrides.overagePriceCents);
			}

			const response = await api.post<ApiSuccessResponse<Subscription>>(
				`/v1/billing/admin/organizations/${orgId}/overrides`,
				payload,
			);

			if (response.success) {
				toast.success('Overrides saved successfully');
				setOverrides({
					monthlyConversionLimit: '',
					concurrentConversionLimit: '',
					maxFileSizeMb: '',
					overagePriceCents: '',
				});
				fetchOrganizations();
			}
		} catch (error) {
			toast.error('Failed to save overrides');
		}
	}

	// Filtered and searched organizations
	const filteredOrgs = useMemo(() => {
		return organizations.filter((org) => {
			const matchesSearch =
				org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				org.id.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesPlan = filterPlan === 'all' || org.plan?.id === filterPlan;
			return matchesSearch && matchesPlan;
		});
	}, [organizations, searchTerm, filterPlan]);

	// Calculate statistics
	const stats = useMemo(() => {
		const totalOrgs = organizations.length;
		const totalConversions = organizations.reduce(
			(acc, org) => acc + org.currentUsage,
			0,
		);
		const totalOverages = organizations.reduce(
			(acc, org) => acc + org.overageCount,
			0,
		);
		const totalRevenue = organizations.reduce((acc, org) => {
			const planPrice = org.plan?.priceCents || 0;
			const overageRevenue =
				org.overageCount *
				(org.subscription?.overrideOveragePriceCents ||
					org.plan?.overagePriceCents ||
					0);
			return acc + planPrice + overageRevenue;
		}, 0);

		const planDistribution = organizations.reduce(
			(acc, org) => {
				const planName = org.plan?.name || 'No Plan';
				acc[planName] = (acc[planName] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		return {
			totalOrgs,
			totalConversions,
			totalOverages,
			totalRevenue,
			planDistribution,
		};
	}, [organizations]);

	// Prepare chart data
	const planChartData = Object.entries(stats.planDistribution).map(
		([name, value]) => ({
			name,
			value,
		}),
	);

	const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!session) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6">
						<p className="text-muted-foreground text-center">
							Please log in to access this page.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl p-6">
			<div className="mb-6">
				<h1 className="mb-2 text-3xl font-bold">Platform Admin Dashboard</h1>
				<p className="text-muted-foreground">
					Manage organizations, subscriptions, and billing
				</p>
			</div>

			{/* Statistics Cards */}
			<div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Organizations
						</CardTitle>
						<Users className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalOrgs}</div>
						<p className="text-muted-foreground text-xs">
							Active organizations
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Conversions
						</CardTitle>
						<Activity className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalConversions}</div>
						<p className="text-muted-foreground text-xs">This billing period</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Overages
						</CardTitle>
						<AlertCircle className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalOverages}</div>
						<p className="text-muted-foreground text-xs">Extra conversions</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Monthly Revenue
						</CardTitle>
						<DollarSign className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${(stats.totalRevenue / 100).toFixed(2)}
						</div>
						<p className="text-muted-foreground text-xs">
							Recurring + overages
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Plan Distribution Chart */}
			<div className="mb-6 grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Plan Distribution</CardTitle>
						<CardDescription>
							Organizations by subscription plan
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={250}>
							<PieChart>
								<Pie
									data={planChartData}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={({ name, percent = 0 }) =>
										`${name} ${(percent * 100).toFixed(0)}%`
									}
									outerRadius={80}
									fill="#8884d8"
									dataKey="value"
								>
									{planChartData.map((_entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common administrative tasks</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button className="w-full justify-start" variant="outline">
							<FileText className="mr-2 h-4 w-4" />
							Generate Billing Report
						</Button>
						<Button className="w-full justify-start" variant="outline">
							<CreditCard className="mr-2 h-4 w-4" />
							Process Pending Invoices
						</Button>
						<Button className="w-full justify-start" variant="outline">
							<Users className="mr-2 h-4 w-4" />
							Bulk Update Subscriptions
						</Button>
						<Button className="w-full justify-start" variant="outline">
							<Settings className="mr-2 h-4 w-4" />
							Configure Billing Settings
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<Card className="mb-6">
				<CardHeader>
					<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
						<CardTitle>Organizations</CardTitle>
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
							<div className="relative flex-1 sm:flex-initial">
								<Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
								<Input
									placeholder="Search organizations..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-8 sm:w-[300px]"
								/>
							</div>
							<Select value={filterPlan} onValueChange={setFilterPlan}>
								<SelectTrigger className="w-full sm:w-[180px]">
									<SelectValue placeholder="Filter by plan" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Plans</SelectItem>
									{plans.map((plan) => (
										<SelectItem key={plan.id} value={plan.id}>
											{plan.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="flex gap-1">
								<Button
									variant={view === 'grid' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setView('grid')}
								>
									Grid
								</Button>
								<Button
									variant={view === 'list' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setView('list')}
								>
									List
								</Button>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{view === 'grid' ? (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{filteredOrgs.map((org) => (
								<Card
									key={org.id}
									className="cursor-pointer transition-shadow hover:shadow-lg"
									onClick={() => setSelectedOrg(org)}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-lg">{org.name}</CardTitle>
												<p className="text-muted-foreground mt-1 text-sm">
													{org.id}
												</p>
											</div>
											<Badge
												variant={
													org.subscription?.status === 'active'
														? 'default'
														: 'secondary'
												}
											>
												{org.subscription?.status || 'No Plan'}
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-2 text-sm">
											<div className="flex justify-between">
												<span className="text-muted-foreground">Plan:</span>
												<span className="font-medium">
													{org.plan?.name || 'None'}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-muted-foreground">Usage:</span>
												<span className="font-medium">
													{org.currentUsage}
													{org.plan?.monthlyConversionLimit
														? ` / ${org.plan.monthlyConversionLimit}`
														: ''}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-muted-foreground">Overages:</span>
												<span className="font-medium">{org.overageCount}</span>
											</div>
											{org.subscription?.overrideMonthlyLimit && (
												<Badge variant="outline" className="text-xs">
													Custom Limits
												</Badge>
											)}
										</div>
										<div className="mt-3 border-t pt-3">
											<Button
												variant="ghost"
												size="sm"
												className="w-full"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedOrg(org);
												}}
											>
												View Details
												<ChevronRight className="ml-1 h-4 w-4" />
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="space-y-2">
							{filteredOrgs.map((org) => (
								<div
									key={org.id}
									className="hover:bg-accent/50 cursor-pointer rounded-lg border p-4 transition-colors"
									onClick={() => setSelectedOrg(org)}
								>
									<div className="flex items-center justify-between">
										<div className="grid flex-1 grid-cols-5 items-center gap-4">
											<div>
												<p className="font-semibold">{org.name}</p>
												<p className="text-muted-foreground text-xs">
													{org.id}
												</p>
											</div>
											<div className="text-center">
												<Badge
													variant={
														org.subscription?.status === 'active'
															? 'default'
															: 'secondary'
													}
												>
													{org.plan?.name || 'No Plan'}
												</Badge>
											</div>
											<div className="text-center">
												<p className="text-sm">
													{org.currentUsage}
													{org.plan?.monthlyConversionLimit
														? ` / ${org.plan.monthlyConversionLimit}`
														: ' conversions'}
												</p>
											</div>
											<div className="text-center">
												<p className="text-sm">{org.overageCount} overages</p>
											</div>
											<div className="text-center">
												<p className="text-sm font-medium">
													${((org.plan?.priceCents || 0) / 100).toFixed(2)}/mo
												</p>
											</div>
										</div>
										<ChevronRight className="ml-4 h-4 w-4" />
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Organization Details Modal */}
			{selectedOrg && (
				<div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-sm">
					<div className="bg-background max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border">
						<div className="bg-background sticky top-0 flex items-start justify-between border-b p-6">
							<div>
								<h2 className="text-2xl font-bold">{selectedOrg.name}</h2>
								<p className="text-muted-foreground mt-1 text-sm">
									{selectedOrg.id}
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setSelectedOrg(null);
									setEditingSubscription(false);
									setNewPlanId('');
								}}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>

						<div className="p-6">
							<Tabs defaultValue="overview" className="w-full">
								<TabsList className="grid w-full grid-cols-4">
									<TabsTrigger value="overview">Overview</TabsTrigger>
									<TabsTrigger value="usage">Usage</TabsTrigger>
									<TabsTrigger value="subscription">Subscription</TabsTrigger>
									<TabsTrigger value="settings">Settings</TabsTrigger>
								</TabsList>

								<TabsContent value="overview" className="space-y-4">
									<div className="grid gap-4 md:grid-cols-2">
										<Card>
											<CardHeader>
												<CardTitle className="text-base">
													Current Plan
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="text-2xl font-bold">
															{selectedOrg.plan?.name || 'No Plan'}
														</span>
														<Badge
															variant={
																selectedOrg.subscription?.status === 'active'
																	? 'default'
																	: 'secondary'
															}
														>
															{selectedOrg.subscription?.status || 'Inactive'}
														</Badge>
													</div>
													<p className="text-muted-foreground text-sm">
														$
														{(
															(selectedOrg.plan?.priceCents || 0) / 100
														).toFixed(2)}
														/month
													</p>
												</div>
											</CardContent>
										</Card>

										<Card>
											<CardHeader>
												<CardTitle className="text-base">
													Current Usage
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-2">
													<div className="flex justify-between">
														<span>Conversions:</span>
														<span className="font-medium">
															{selectedOrg.currentUsage}
															{selectedOrg.plan?.monthlyConversionLimit
																? ` / ${selectedOrg.plan.monthlyConversionLimit}`
																: ''}
														</span>
													</div>
													<div className="flex justify-between">
														<span>Overages:</span>
														<span className="font-medium">
															{selectedOrg.overageCount}
														</span>
													</div>
													{selectedOrg.plan?.monthlyConversionLimit && (
														<div className="pt-2">
															<div className="bg-secondary h-2 w-full rounded-full">
																<div
																	className="bg-primary h-2 rounded-full"
																	style={{
																		width: `${Math.min(
																			100,
																			(selectedOrg.currentUsage /
																				selectedOrg.plan
																					.monthlyConversionLimit) *
																				100,
																		)}%`,
																	}}
																/>
															</div>
															<p className="text-muted-foreground mt-1 text-xs">
																{Math.round(
																	(selectedOrg.currentUsage /
																		selectedOrg.plan.monthlyConversionLimit) *
																		100,
																)}
																% of limit used
															</p>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									</div>

									<Card>
										<CardHeader>
											<CardTitle className="text-base">
												Organization Details
											</CardTitle>
										</CardHeader>
										<CardContent>
											<dl className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<dt className="text-muted-foreground">Created</dt>
													<dd className="font-medium">
														{new Date(
															selectedOrg.createdAt,
														).toLocaleDateString()}
													</dd>
												</div>
												<div>
													<dt className="text-muted-foreground">
														Billing Period
													</dt>
													<dd className="font-medium">
														{selectedOrg.subscription?.currentPeriodStart
															? `${new Date(selectedOrg.subscription.currentPeriodStart).toLocaleDateString()} - ${new Date(selectedOrg.subscription.currentPeriodEnd).toLocaleDateString()}`
															: 'N/A'}
													</dd>
												</div>
												<div>
													<dt className="text-muted-foreground">
														File Size Limit
													</dt>
													<dd className="font-medium">
														{selectedOrg.subscription?.overrideMaxFileSizeMb ||
															selectedOrg.plan?.maxFileSizeMb ||
															'Unlimited'}{' '}
														MB
													</dd>
												</div>
												<div>
													<dt className="text-muted-foreground">
														Concurrent Limit
													</dt>
													<dd className="font-medium">
														{selectedOrg.subscription
															?.overrideConcurrentLimit ||
															selectedOrg.plan?.concurrentConversionLimit ||
															'Unlimited'}
													</dd>
												</div>
											</dl>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="usage" className="space-y-4">
									<Card>
										<CardHeader>
											<CardTitle className="text-base">Usage History</CardTitle>
											<CardDescription>
												Monthly conversion trends
											</CardDescription>
										</CardHeader>
										<CardContent>
											<ResponsiveContainer width="100%" height={300}>
												<LineChart data={orgUsageHistory}>
													<CartesianGrid strokeDasharray="3 3" />
													<XAxis
														dataKey="month"
														tickFormatter={(value) => {
															const months = [
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
															return months[value - 1];
														}}
													/>
													<YAxis />
													<Tooltip />
													<Legend />
													<Line
														type="monotone"
														dataKey="conversionCount"
														stroke="#8884d8"
														name="Conversions"
													/>
													<Line
														type="monotone"
														dataKey="overageCount"
														stroke="#82ca9d"
														name="Overages"
													/>
												</LineChart>
											</ResponsiveContainer>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle className="text-base">
												Conversion Types
											</CardTitle>
											<CardDescription>
												Breakdown by conversion type
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="space-y-2">
												{orgUsageHistory[0]?.conversionTypeBreakdown &&
													Object.entries(
														orgUsageHistory[0].conversionTypeBreakdown,
													).map(([type, count]) => (
														<div
															key={type}
															className="flex items-center justify-between"
														>
															<span className="text-sm">{type}</span>
															<span className="font-medium">{count}</span>
														</div>
													))}
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="subscription" className="space-y-4">
									<Card>
										<CardHeader>
											<CardTitle className="text-base">
												Subscription Management
											</CardTitle>
											<CardDescription>
												Update plan and billing settings
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											{!editingSubscription ? (
												<div className="space-y-4">
													<div className="flex items-center justify-between rounded-lg border p-4">
														<div>
															<p className="font-medium">
																{selectedOrg.plan?.name || 'No Plan'}
															</p>
															<p className="text-muted-foreground text-sm">
																$
																{(
																	(selectedOrg.plan?.priceCents || 0) / 100
																).toFixed(2)}
																/month
															</p>
														</div>
														<Button
															onClick={() => setEditingSubscription(true)}
														>
															Change Plan
														</Button>
													</div>
												</div>
											) : (
												<div className="space-y-4">
													<div className="space-y-2">
														<Label>Select New Plan</Label>
														<Select
															value={newPlanId}
															onValueChange={setNewPlanId}
														>
															<SelectTrigger>
																<SelectValue placeholder="Choose a plan" />
															</SelectTrigger>
															<SelectContent>
																{plans.map((plan) => (
																	<SelectItem key={plan.id} value={plan.id}>
																		<div className="flex w-full items-center justify-between">
																			<span>{plan.name}</span>
																			<span className="text-muted-foreground ml-4">
																				${(plan.priceCents / 100).toFixed(2)}/mo
																			</span>
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													<div className="flex gap-2">
														<Button
															variant="outline"
															onClick={() => {
																setEditingSubscription(false);
																setNewPlanId('');
															}}
														>
															Cancel
														</Button>
														<Button
															onClick={() => {
																if (newPlanId) {
																	updateSubscriptionPlan(
																		selectedOrg.id,
																		newPlanId,
																	);
																}
															}}
															disabled={!newPlanId}
														>
															Update Plan
														</Button>
													</div>
												</div>
											)}
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle className="text-base">
												Billing Information
											</CardTitle>
										</CardHeader>
										<CardContent>
											<dl className="space-y-2 text-sm">
												<div className="flex justify-between">
													<dt className="text-muted-foreground">
														Next Invoice
													</dt>
													<dd className="font-medium">
														{selectedOrg.subscription?.currentPeriodEnd
															? new Date(
																	selectedOrg.subscription.currentPeriodEnd,
																).toLocaleDateString()
															: 'N/A'}
													</dd>
												</div>
												<div className="flex justify-between">
													<dt className="text-muted-foreground">
														Overage Rate
													</dt>
													<dd className="font-medium">
														$
														{(
															(selectedOrg.subscription
																?.overrideOveragePriceCents ||
																selectedOrg.plan?.overagePriceCents ||
																0) / 100
														).toFixed(2)}{' '}
														per conversion
													</dd>
												</div>
												<div className="flex justify-between">
													<dt className="text-muted-foreground">
														Current Overages
													</dt>
													<dd className="font-medium">
														{selectedOrg.overageCount} × $
														{(
															(selectedOrg.subscription
																?.overrideOveragePriceCents ||
																selectedOrg.plan?.overagePriceCents ||
																0) / 100
														).toFixed(2)}{' '}
														= $
														{(
															(selectedOrg.overageCount *
																(selectedOrg.subscription
																	?.overrideOveragePriceCents ||
																	selectedOrg.plan?.overagePriceCents ||
																	0)) /
															100
														).toFixed(2)}
													</dd>
												</div>
											</dl>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="settings" className="space-y-4">
									<Card>
										<CardHeader>
											<CardTitle className="text-base">
												Custom Limits Override
											</CardTitle>
											<CardDescription>
												Set custom limits for this organization (overrides plan
												defaults)
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid gap-4 md:grid-cols-2">
												<div>
													<Label htmlFor="monthlyLimit">
														Monthly Conversion Limit
													</Label>
													<Input
														id="monthlyLimit"
														type="number"
														placeholder={
															selectedOrg.plan?.monthlyConversionLimit?.toString() ||
															'Unlimited'
														}
														value={overrides.monthlyConversionLimit}
														onChange={(e) =>
															setOverrides({
																...overrides,
																monthlyConversionLimit: e.target.value,
															})
														}
													/>
													<p className="text-muted-foreground mt-1 text-xs">
														Current:{' '}
														{selectedOrg.subscription?.overrideMonthlyLimit ||
															selectedOrg.plan?.monthlyConversionLimit ||
															'Unlimited'}
													</p>
												</div>

												<div>
													<Label htmlFor="concurrentLimit">
														Concurrent Conversion Limit
													</Label>
													<Input
														id="concurrentLimit"
														type="number"
														placeholder={
															selectedOrg.plan?.concurrentConversionLimit?.toString() ||
															'Unlimited'
														}
														value={overrides.concurrentConversionLimit}
														onChange={(e) =>
															setOverrides({
																...overrides,
																concurrentConversionLimit: e.target.value,
															})
														}
													/>
													<p className="text-muted-foreground mt-1 text-xs">
														Current:{' '}
														{selectedOrg.subscription
															?.overrideConcurrentLimit ||
															selectedOrg.plan?.concurrentConversionLimit ||
															'Unlimited'}
													</p>
												</div>

												<div>
													<Label htmlFor="fileSize">Max File Size (MB)</Label>
													<Input
														id="fileSize"
														type="number"
														placeholder={
															selectedOrg.plan?.maxFileSizeMb?.toString() ||
															'Unlimited'
														}
														value={overrides.maxFileSizeMb}
														onChange={(e) =>
															setOverrides({
																...overrides,
																maxFileSizeMb: e.target.value,
															})
														}
													/>
													<p className="text-muted-foreground mt-1 text-xs">
														Current:{' '}
														{selectedOrg.subscription?.overrideMaxFileSizeMb ||
															selectedOrg.plan?.maxFileSizeMb ||
															'Unlimited'}{' '}
														MB
													</p>
												</div>

												<div>
													<Label htmlFor="overagePrice">
														Overage Price (cents)
													</Label>
													<Input
														id="overagePrice"
														type="number"
														placeholder="Price per conversion over limit"
														value={overrides.overagePriceCents}
														onChange={(e) =>
															setOverrides({
																...overrides,
																overagePriceCents: e.target.value,
															})
														}
													/>
													<p className="text-muted-foreground mt-1 text-xs">
														Current:{' '}
														{selectedOrg.subscription
															?.overrideOveragePriceCents ||
															selectedOrg.plan?.overagePriceCents ||
															0}{' '}
														cents
													</p>
												</div>
											</div>

											<div className="flex gap-2">
												<Button
													variant="outline"
													onClick={() =>
														setOverrides({
															monthlyConversionLimit: '',
															concurrentConversionLimit: '',
															maxFileSizeMb: '',
															overagePriceCents: '',
														})
													}
												>
													Clear
												</Button>
												<Button onClick={() => saveOverrides(selectedOrg.id)}>
													Save Overrides
												</Button>
											</div>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle className="text-base">Danger Zone</CardTitle>
											<CardDescription>Irreversible actions</CardDescription>
										</CardHeader>
										<CardContent className="space-y-2">
											<Button variant="destructive" className="w-full">
												Suspend Organization
											</Button>
											<Button variant="outline" className="w-full">
												Reset Usage Counters
											</Button>
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
