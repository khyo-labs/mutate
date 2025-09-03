import { createFileRoute } from '@tanstack/react-router';
import {
	AlertCircle,
	Building2,
	Calendar,
	ChevronRight,
	CreditCard,
	Filter,
	Loader2,
	MoreVertical,
	Pause,
	Play,
	Search,
	Settings,
	TrendingDown,
	TrendingUp,
	Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/admin/workspaces/')({
	component: WorkspaceManagement,
});

interface Workspace {
	id: string;
	name: string;
	slug?: string;
	createdAt: string;
	subscription: {
		id: string;
		planId: string;
		status: string;
		currentPeriodStart: string;
		currentPeriodEnd: string;
	} | null;
	plan: {
		id: string;
		name: string;
		priceCents: number;
		monthlyConversionLimit: number | null;
	} | null;
	currentUsage: number;
	overageCount: number;
	memberCount?: number;
	lastActivityAt?: string;
}

function WorkspaceManagement() {
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterPlan, setFilterPlan] = useState('all');
	const [filterStatus, setFilterStatus] = useState('all');
	const [sortBy, setSortBy] = useState('created');
	const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
		null,
	);
	const [showLimitModal, setShowLimitModal] = useState(false);
	const [limitOverrides, setLimitOverrides] = useState({
		monthlyConversionLimit: '',
		concurrentConversionLimit: '',
		maxFileSizeMb: '',
		overagePriceCents: '',
	});

	useEffect(() => {
		fetchWorkspaces();
	}, []);

	async function fetchWorkspaces() {
		try {
			setLoading(true);
			const response = await api.get('/v1/admin/workspaces');
			setWorkspaces(response.data);
		} catch (error) {
			console.error('Failed to fetch workspaces:', error);
			toast.error('Failed to load workspaces');
		} finally {
			setLoading(false);
		}
	}

	async function suspendWorkspace(workspaceId: string) {
		try {
			await api.post(`/v1/admin/workspaces/${workspaceId}/suspend`);
			toast.success('Workspace suspended successfully');
			fetchWorkspaces();
		} catch (error) {
			toast.error('Failed to suspend workspace');
		}
	}

	async function activateWorkspace(workspaceId: string) {
		try {
			await api.post(`/v1/admin/workspaces/${workspaceId}/activate`);
			toast.success('Workspace activated successfully');
			fetchWorkspaces();
		} catch (error) {
			toast.error('Failed to activate workspace');
		}
	}

	async function updateLimits(workspaceId: string) {
		try {
			const payload: Record<string, number | null> = {};
			if (limitOverrides.monthlyConversionLimit) {
				payload.monthlyConversionLimit = parseInt(
					limitOverrides.monthlyConversionLimit,
				);
			}
			if (limitOverrides.concurrentConversionLimit) {
				payload.concurrentConversionLimit = parseInt(
					limitOverrides.concurrentConversionLimit,
				);
			}
			if (limitOverrides.maxFileSizeMb) {
				payload.maxFileSizeMb = parseInt(limitOverrides.maxFileSizeMb);
			}
			if (limitOverrides.overagePriceCents) {
				payload.overagePriceCents = parseInt(limitOverrides.overagePriceCents);
			}

			await api.post(`/v1/admin/workspaces/${workspaceId}/limits`, payload);
			toast.success('Limits updated successfully');
			setShowLimitModal(false);
			setSelectedWorkspace(null);
			fetchWorkspaces();
		} catch (error) {
			toast.error('Failed to update limits');
		}
	}

	const filteredWorkspaces = workspaces.filter((workspace) => {
		const matchesSearch =
			workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			workspace.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
			workspace.slug?.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesPlan =
			filterPlan === 'all' || workspace.plan?.name === filterPlan;

		const matchesStatus =
			filterStatus === 'all' || workspace.subscription?.status === filterStatus;

		return matchesSearch && matchesPlan && matchesStatus;
	});

	const sortedWorkspaces = [...filteredWorkspaces].sort((a, b) => {
		switch (sortBy) {
			case 'name':
				return a.name.localeCompare(b.name);
			case 'usage':
				return b.currentUsage - a.currentUsage;
			case 'created':
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			case 'activity':
				return (
					new Date(b.lastActivityAt || b.createdAt).getTime() -
					new Date(a.lastActivityAt || a.createdAt).getTime()
				);
			default:
				return 0;
		}
	});

	// Calculate statistics
	const stats = {
		total: workspaces.length,
		active: workspaces.filter((w) => w.subscription?.status === 'active')
			.length,
		suspended: workspaces.filter((w) => w.subscription?.status === 'suspended')
			.length,
		totalUsage: workspaces.reduce((sum, w) => sum + w.currentUsage, 0),
		totalOverages: workspaces.reduce((sum, w) => sum + w.overageCount, 0),
	};

	if (loading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Workspace Management</h2>
				<p className="text-muted-foreground">
					Manage all workspaces across the platform
				</p>
			</div>

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-5">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Workspaces
						</CardTitle>
						<Building2 className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
						<p className="text-muted-foreground text-xs">All organizations</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active</CardTitle>
						<Play className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.active}</div>
						<p className="text-muted-foreground text-xs">Currently active</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Suspended</CardTitle>
						<Pause className="h-4 w-4 text-yellow-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.suspended}</div>
						<p className="text-muted-foreground text-xs">Currently suspended</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Usage</CardTitle>
						<TrendingUp className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats.totalUsage.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							Transformations this period
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Overages</CardTitle>
						<AlertCircle className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalOverages}</div>
						<p className="text-muted-foreground text-xs">
							Total overage charges
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters and Search */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>All Workspaces</CardTitle>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={fetchWorkspaces}>
								Refresh
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-4 flex flex-wrap gap-2">
						<div className="relative flex-1">
							<Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
							<Input
								placeholder="Search workspaces..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-8"
							/>
						</div>
						<Select value={filterPlan} onValueChange={setFilterPlan}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Filter by plan" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Plans</SelectItem>
								<SelectItem value="Free">Free</SelectItem>
								<SelectItem value="Starter">Starter</SelectItem>
								<SelectItem value="Pro">Pro</SelectItem>
								<SelectItem value="Enterprise">Enterprise</SelectItem>
							</SelectContent>
						</Select>
						<Select value={filterStatus} onValueChange={setFilterStatus}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
								<SelectItem value="trial">Trial</SelectItem>
							</SelectContent>
						</Select>
						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="created">Created Date</SelectItem>
								<SelectItem value="name">Name</SelectItem>
								<SelectItem value="usage">Usage</SelectItem>
								<SelectItem value="activity">Last Activity</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Workspace</TableHead>
									<TableHead>Plan</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Usage</TableHead>
									<TableHead>Members</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedWorkspaces.map((workspace) => (
									<TableRow key={workspace.id}>
										<TableCell>
											<div>
												<div className="font-medium">{workspace.name}</div>
												<div className="text-muted-foreground text-xs">
													{workspace.slug || workspace.id}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{workspace.plan?.name || 'No Plan'}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													workspace.subscription?.status === 'active'
														? 'default'
														: workspace.subscription?.status === 'suspended'
															? 'secondary'
															: 'outline'
												}
											>
												{workspace.subscription?.status || 'Inactive'}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<span className="font-medium">
													{workspace.currentUsage}
												</span>
												{workspace.plan?.monthlyConversionLimit && (
													<span className="text-muted-foreground">
														{' '}
														/ {workspace.plan.monthlyConversionLimit}
													</span>
												)}
												{workspace.overageCount > 0 && (
													<Badge variant="destructive" className="ml-2 text-xs">
														+{workspace.overageCount}
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Users className="h-3 w-3" />
												<span className="text-sm">
													{workspace.memberCount || 0}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="text-muted-foreground text-sm">
												{new Date(workspace.createdAt).toLocaleDateString()}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuLabel>Actions</DropdownMenuLabel>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() =>
															(window.location.href = `/admin/workspaces/${workspace.id}`)
														}
													>
														<Settings className="mr-2 h-4 w-4" />
														View Details
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => {
															setSelectedWorkspace(workspace);
															setShowLimitModal(true);
														}}
													>
														<CreditCard className="mr-2 h-4 w-4" />
														Adjust Limits
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													{workspace.subscription?.status === 'active' ? (
														<DropdownMenuItem
															onClick={() => suspendWorkspace(workspace.id)}
															className="text-yellow-600"
														>
															<Pause className="mr-2 h-4 w-4" />
															Suspend Workspace
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={() => activateWorkspace(workspace.id)}
															className="text-green-600"
														>
															<Play className="mr-2 h-4 w-4" />
															Activate Workspace
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Limit Override Modal */}
			<Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Adjust Workspace Limits</DialogTitle>
						<DialogDescription>
							Override the default plan limits for {selectedWorkspace?.name}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="monthlyLimit">Monthly Conversion Limit</Label>
							<Input
								id="monthlyLimit"
								type="number"
								placeholder={
									selectedWorkspace?.plan?.monthlyConversionLimit?.toString() ||
									'Unlimited'
								}
								value={limitOverrides.monthlyConversionLimit}
								onChange={(e) =>
									setLimitOverrides({
										...limitOverrides,
										monthlyConversionLimit: e.target.value,
									})
								}
							/>
						</div>
						<div>
							<Label htmlFor="concurrentLimit">
								Concurrent Conversion Limit
							</Label>
							<Input
								id="concurrentLimit"
								type="number"
								placeholder="Enter limit or leave empty"
								value={limitOverrides.concurrentConversionLimit}
								onChange={(e) =>
									setLimitOverrides({
										...limitOverrides,
										concurrentConversionLimit: e.target.value,
									})
								}
							/>
						</div>
						<div>
							<Label htmlFor="fileSize">Max File Size (MB)</Label>
							<Input
								id="fileSize"
								type="number"
								placeholder="Enter size or leave empty"
								value={limitOverrides.maxFileSizeMb}
								onChange={(e) =>
									setLimitOverrides({
										...limitOverrides,
										maxFileSizeMb: e.target.value,
									})
								}
							/>
						</div>
						<div>
							<Label htmlFor="overagePrice">Overage Price (cents)</Label>
							<Input
								id="overagePrice"
								type="number"
								placeholder="Price per conversion over limit"
								value={limitOverrides.overagePriceCents}
								onChange={(e) =>
									setLimitOverrides({
										...limitOverrides,
										overagePriceCents: e.target.value,
									})
								}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setShowLimitModal(false);
									setSelectedWorkspace(null);
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={() =>
									selectedWorkspace && updateLimits(selectedWorkspace.id)
								}
							>
								Save Changes
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
