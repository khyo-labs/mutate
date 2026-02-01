import { createFileRoute } from '@tanstack/react-router';
import {
	Code,
	Copy,
	Edit,
	Loader2,
	MoreVertical,
	Percent,
	Plus,
	RefreshCw,
	Settings,
	ToggleLeft,
	ToggleRight,
	Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/admin/features/')({
	component: FeatureFlagsManagement,
});

interface FeatureFlag {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	rolloutPercentage: number;
	workspaceOverrides?: Record<string, boolean>;
	createdAt: string;
	updatedAt: string;
}

function FeatureFlagsManagement() {
	const [flags, setFlags] = useState<FeatureFlag[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
	const [showOverrideModal, setShowOverrideModal] = useState(false);
	const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
	const [searchTerm, setSearchTerm] = useState('');

	const [formData, setFormData] = useState({
		name: '',
		description: '',
		enabled: false,
		rolloutPercentage: 0,
	});

	const [overrideData, setOverrideData] = useState({
		workspaceId: '',
		enabled: true,
	});

	useEffect(() => {
		fetchFeatureFlags();
	}, []);

	async function fetchFeatureFlags() {
		try {
			setLoading(true);
			const flags = await api.get<FeatureFlag[]>('/v1/admin/features');
			setFlags(flags);
		} catch (error) {
			console.error('Failed to fetch feature flags:', error);
			toast.error('Failed to load feature flags');
		} finally {
			setLoading(false);
		}
	}

	async function createFeatureFlag() {
		try {
			await api.post('/v1/admin/features', formData);
			toast.success('Feature flag created successfully');
			setShowCreateModal(false);
			resetForm();
			fetchFeatureFlags();
		} catch (error) {
			toast.error('Failed to create feature flag');
		}
	}

	async function updateFeatureFlag() {
		if (!editingFlag) return;

		try {
			await api.put(`/v1/admin/features/${editingFlag.id}`, formData);
			toast.success('Feature flag updated successfully');
			setEditingFlag(null);
			resetForm();
			fetchFeatureFlags();
		} catch (error) {
			toast.error('Failed to update feature flag');
		}
	}

	async function toggleFlag(flagId: string, enabled: boolean) {
		try {
			await api.patch(`/v1/admin/features/${flagId}`, { enabled });
			toast.success(`Feature flag ${enabled ? 'enabled' : 'disabled'}`);
			fetchFeatureFlags();
		} catch (error) {
			toast.error('Failed to toggle feature flag');
		}
	}

	async function deleteFlag(flagId: string) {
		if (!confirm('Are you sure you want to delete this feature flag?')) {
			return;
		}

		try {
			await api.delete(`/v1/admin/features/${flagId}`);
			toast.success('Feature flag deleted successfully');
			fetchFeatureFlags();
		} catch (error) {
			toast.error('Failed to delete feature flag');
		}
	}

	async function addWorkspaceOverride() {
		if (!selectedFlag) return;

		try {
			await api.post(`/v1/admin/features/${selectedFlag.id}/override`, {
				workspaceId: overrideData.workspaceId,
				enabled: overrideData.enabled,
			});
			toast.success('Workspace override added');
			setShowOverrideModal(false);
			setOverrideData({ workspaceId: '', enabled: true });
			fetchFeatureFlags();
		} catch (error) {
			toast.error('Failed to add workspace override');
		}
	}

	async function removeOverride(flagId: string, workspaceId: string) {
		try {
			await api.delete(`/v1/admin/features/${flagId}/override/${workspaceId}`);
			toast.success('Override removed');
			fetchFeatureFlags();
		} catch (error) {
			toast.error('Failed to remove override');
		}
	}

	function resetForm() {
		setFormData({
			name: '',
			description: '',
			enabled: false,
			rolloutPercentage: 0,
		});
	}

	function copyFlagName(name: string) {
		navigator.clipboard.writeText(name);
		toast.success('Flag name copied to clipboard');
	}

	const filteredFlags = flags.filter(
		(flag) =>
			flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			flag.description.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Calculate statistics
	const stats = {
		total: flags.length,
		enabled: flags.filter((f) => f.enabled).length,
		partialRollout: flags.filter(
			(f) => f.enabled && f.rolloutPercentage > 0 && f.rolloutPercentage < 100,
		).length,
		withOverrides: flags.filter(
			(f) => f.workspaceOverrides && Object.keys(f.workspaceOverrides).length > 0,
		).length,
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
				<h2 className="text-2xl font-bold">Feature Flags</h2>
				<p className="text-muted-foreground">Manage feature rollouts and A/B testing</p>
			</div>

			{/* Statistics */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Flags</CardTitle>
						<ToggleLeft className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
						<p className="text-muted-foreground text-xs">Feature flags</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Enabled</CardTitle>
						<ToggleRight className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.enabled}</div>
						<p className="text-muted-foreground text-xs">Active features</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Partial Rollout</CardTitle>
						<Percent className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.partialRollout}</div>
						<p className="text-muted-foreground text-xs">Gradual rollouts</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">With Overrides</CardTitle>
						<Settings className="h-4 w-4 text-purple-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.withOverrides}</div>
						<p className="text-muted-foreground text-xs">Custom settings</p>
					</CardContent>
				</Card>
			</div>

			{/* Feature Flags List */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Feature Flags</CardTitle>
						<div className="flex gap-2">
							<div className="relative">
								<Input
									placeholder="Search flags..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-[200px]"
								/>
							</div>
							<Button
								onClick={() => {
									resetForm();
									setShowCreateModal(true);
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								Create Flag
							</Button>
							<Button variant="outline" size="icon" onClick={fetchFeatureFlags}>
								<RefreshCw className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Flag</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Rollout</TableHead>
									<TableHead>Overrides</TableHead>
									<TableHead>Updated</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredFlags.map((flag) => (
									<TableRow key={flag.id}>
										<TableCell>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-medium">{flag.name}</span>
													<Button
														variant="ghost"
														size="icon"
														className="h-6 w-6"
														onClick={() => copyFlagName(flag.name)}
													>
														<Copy className="h-3 w-3" />
													</Button>
												</div>
												<p className="text-muted-foreground text-xs">{flag.description}</p>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Switch
													checked={flag.enabled}
													onCheckedChange={(checked) => toggleFlag(flag.id, checked)}
												/>
												<Badge variant={flag.enabled ? 'default' : 'secondary'}>
													{flag.enabled ? 'Enabled' : 'Disabled'}
												</Badge>
											</div>
										</TableCell>
										<TableCell>
											{flag.enabled && (
												<div className="w-[120px]">
													<div className="flex items-center justify-between text-xs">
														<span>{flag.rolloutPercentage}%</span>
													</div>
													<Progress value={flag.rolloutPercentage} className="mt-1" />
												</div>
											)}
										</TableCell>
										<TableCell>
											{flag.workspaceOverrides &&
											Object.keys(flag.workspaceOverrides).length > 0 ? (
												<Badge variant="outline">
													{Object.keys(flag.workspaceOverrides).length} overrides
												</Badge>
											) : (
												<span className="text-muted-foreground text-sm">-</span>
											)}
										</TableCell>
										<TableCell>
											<div className="text-muted-foreground text-sm">
												{new Date(flag.updatedAt).toLocaleDateString()}
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
														onClick={() => {
															setFormData({
																name: flag.name,
																description: flag.description,
																enabled: flag.enabled,
																rolloutPercentage: flag.rolloutPercentage,
															});
															setEditingFlag(flag);
														}}
													>
														<Edit className="mr-2 h-4 w-4" />
														Edit Flag
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => {
															setSelectedFlag(flag);
															setShowOverrideModal(true);
														}}
													>
														<Settings className="mr-2 h-4 w-4" />
														Manage Overrides
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => copyFlagName(flag.name)}>
														<Code className="mr-2 h-4 w-4" />
														Copy Name
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => deleteFlag(flag.id)}
														className="text-red-600"
													>
														<Trash2 className="mr-2 h-4 w-4" />
														Delete Flag
													</DropdownMenuItem>
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

			{/* Create/Edit Modal */}
			<Dialog
				open={showCreateModal || !!editingFlag}
				onOpenChange={(open) => {
					if (!open) {
						setShowCreateModal(false);
						setEditingFlag(null);
						resetForm();
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}</DialogTitle>
						<DialogDescription>
							{editingFlag
								? 'Update the feature flag configuration'
								: 'Create a new feature flag for gradual rollout'}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="name">Flag Name</Label>
							<Input
								id="name"
								placeholder="e.g., new_dashboard_ui"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								disabled={!!editingFlag}
							/>
							<p className="text-muted-foreground mt-1 text-xs">Use snake_case for consistency</p>
						</div>
						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								placeholder="Describe what this feature flag controls..."
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								rows={3}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="enabled">Enable Flag</Label>
							<Switch
								id="enabled"
								checked={formData.enabled}
								onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
							/>
						</div>
						{formData.enabled && (
							<div>
								<Label htmlFor="rollout">Rollout Percentage: {formData.rolloutPercentage}%</Label>
								<Slider
									id="rollout"
									min={0}
									max={100}
									step={5}
									value={[formData.rolloutPercentage]}
									onValueChange={(value) =>
										setFormData({ ...formData, rolloutPercentage: value[0] })
									}
									className="mt-2"
								/>
								<p className="text-muted-foreground mt-1 text-xs">
									Percentage of users who will see this feature
								</p>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowCreateModal(false);
								setEditingFlag(null);
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button onClick={editingFlag ? updateFeatureFlag : createFeatureFlag}>
							{editingFlag ? 'Update' : 'Create'} Flag
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Override Modal */}
			<Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Workspace Overrides</DialogTitle>
						<DialogDescription>
							Manage workspace-specific overrides for {selectedFlag?.name}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{selectedFlag?.workspaceOverrides &&
							Object.keys(selectedFlag.workspaceOverrides).length > 0 && (
								<div>
									<Label>Current Overrides</Label>
									<div className="mt-2 space-y-2">
										{Object.entries(selectedFlag.workspaceOverrides).map(
											([workspaceId, enabled]) => (
												<div
													key={workspaceId}
													className="flex items-center justify-between rounded-lg border p-2"
												>
													<div className="flex items-center gap-2">
														<span className="font-mono text-sm">{workspaceId}</span>
														<Badge variant={enabled ? 'default' : 'secondary'}>
															{enabled ? 'Enabled' : 'Disabled'}
														</Badge>
													</div>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => removeOverride(selectedFlag.id, workspaceId)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											),
										)}
									</div>
								</div>
							)}

						<div>
							<Label htmlFor="workspaceId">Add Override</Label>
							<div className="mt-2 flex gap-2">
								<Input
									id="workspaceId"
									placeholder="Workspace ID"
									value={overrideData.workspaceId}
									onChange={(e) =>
										setOverrideData({
											...overrideData,
											workspaceId: e.target.value,
										})
									}
								/>
								<Switch
									checked={overrideData.enabled}
									onCheckedChange={(checked) =>
										setOverrideData({ ...overrideData, enabled: checked })
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowOverrideModal(false)}>
							Close
						</Button>
						<Button onClick={addWorkspaceOverride} disabled={!overrideData.workspaceId}>
							Add Override
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
