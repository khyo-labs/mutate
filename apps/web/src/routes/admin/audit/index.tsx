import { createFileRoute } from '@tanstack/react-router';
import {
	Calendar,
	Download,
	FileText,
	Loader2,
	RefreshCw,
	Search,
	Shield,
	User,
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

export const Route = createFileRoute('/admin/audit/')({
	component: AuditLogViewer,
});

interface AuditLog {
	id: string;
	adminId: string;
	adminName?: string;
	adminEmail?: string;
	action: string;
	resourceType?: string;
	resourceId?: string;
	changes?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	createdAt: string;
}

function AuditLogViewer() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterAction, setFilterAction] = useState('all');
	const [filterResourceType, setFilterResourceType] = useState('all');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

	useEffect(() => {
		fetchAuditLogs();
	}, [currentPage, filterAction, filterResourceType, dateFrom, dateTo]);

	async function fetchAuditLogs() {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: '50',
			});

			if (filterAction !== 'all') params.append('action', filterAction);
			if (filterResourceType !== 'all')
				params.append('resourceType', filterResourceType);
			if (dateFrom) params.append('from', dateFrom);
			if (dateTo) params.append('to', dateTo);
			if (searchTerm) params.append('search', searchTerm);

			const response = await api.get(`/v1/admin/audit/logs?${params}`);
			const data = response.data as {
				logs: AuditLog[];
				totalPages: number;
			};
			setLogs(data.logs);
			setTotalPages(data.totalPages);
		} catch (error) {
			console.error('Failed to fetch audit logs:', error);
			toast.error('Failed to load audit logs');
		} finally {
			setLoading(false);
		}
	}

	async function exportLogs() {
		try {
			const params = new URLSearchParams({
				format: 'csv',
			});

			if (filterAction !== 'all') params.append('action', filterAction);
			if (filterResourceType !== 'all')
				params.append('resourceType', filterResourceType);
			if (dateFrom) params.append('from', dateFrom);
			if (dateTo) params.append('to', dateTo);

			const response = await api.get(`/v1/admin/audit/export?${params}`);

			// Create download link
			const blob = response.data as Blob;
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
			document.body.appendChild(link);
			link.click();
			link.remove();

			toast.success('Audit logs exported successfully');
		} catch (error) {
			toast.error('Failed to export audit logs');
		}
	}

	const getActionBadgeVariant = (action: string) => {
		if (action.includes('DELETE') || action.includes('SUSPEND'))
			return 'destructive';
		if (action.includes('CREATE') || action.includes('ACTIVATE'))
			return 'default';
		if (action.includes('UPDATE') || action.includes('EDIT'))
			return 'secondary';
		if (action.includes('VIEW') || action.includes('ACCESS')) return 'outline';
		return 'outline';
	};

	const getResourceIcon = (resourceType?: string) => {
		switch (resourceType) {
			case 'USER':
				return <User className="h-3 w-3" />;
			case 'WORKSPACE':
				return <Shield className="h-3 w-3" />;
			case 'API_ENDPOINT':
				return <FileText className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const filteredLogs = logs.filter((log) => {
		if (!searchTerm) return true;
		const searchLower = searchTerm.toLowerCase();
		return (
			log.adminName?.toLowerCase().includes(searchLower) ||
			log.adminEmail?.toLowerCase().includes(searchLower) ||
			log.action.toLowerCase().includes(searchLower) ||
			log.resourceId?.toLowerCase().includes(searchLower) ||
			log.ipAddress?.includes(searchTerm)
		);
	});

	// Get unique actions and resource types for filters
	const uniqueActions = [...new Set(logs.map((log) => log.action))];
	const uniqueResourceTypes = [
		...new Set(logs.map((log) => log.resourceType).filter(Boolean)),
	];

	if (loading && logs.length === 0) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Audit Logs</h2>
				<p className="text-muted-foreground">
					Track all administrative actions across the platform
				</p>
			</div>

			{/* Statistics */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Actions Today
						</CardTitle>
						<Calendar className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{
								logs.filter((log) => {
									const today = new Date().toDateString();
									return new Date(log.createdAt).toDateString() === today;
								}).length
							}
						</div>
						<p className="text-muted-foreground text-xs">Admin actions today</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Unique Admins</CardTitle>
						<User className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{[...new Set(logs.map((log) => log.adminId))].length}
						</div>
						<p className="text-muted-foreground text-xs">Active admins</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Critical Actions
						</CardTitle>
						<Shield className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{
								logs.filter(
									(log) =>
										log.action.includes('DELETE') ||
										log.action.includes('SUSPEND') ||
										log.action.includes('ADMIN'),
								).length
							}
						</div>
						<p className="text-muted-foreground text-xs">
							Sensitive operations
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Logs</CardTitle>
						<FileText className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{logs.length}</div>
						<p className="text-muted-foreground text-xs">In current view</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Audit Trail</CardTitle>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={exportLogs}>
								<Download className="mr-2 h-4 w-4" />
								Export
							</Button>
							<Button variant="outline" size="sm" onClick={fetchAuditLogs}>
								<RefreshCw className="mr-2 h-4 w-4" />
								Refresh
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-4 grid gap-2 md:grid-cols-5">
						<div className="relative">
							<Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
							<Input
								placeholder="Search logs..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-8"
							/>
						</div>
						<Select value={filterAction} onValueChange={setFilterAction}>
							<SelectTrigger>
								<SelectValue placeholder="Filter by action" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Actions</SelectItem>
								{uniqueActions.map((action) => (
									<SelectItem key={action} value={action}>
										{action}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={filterResourceType}
							onValueChange={setFilterResourceType}
						>
							<SelectTrigger>
								<SelectValue placeholder="Resource type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Resources</SelectItem>
								{uniqueResourceTypes.map((type) => (
									<SelectItem key={type} value={type!}>
										{type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							type="date"
							placeholder="From date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
						/>
						<Input
							type="date"
							placeholder="To date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
						/>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Timestamp</TableHead>
									<TableHead>Admin</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Resource</TableHead>
									<TableHead>IP Address</TableHead>
									<TableHead>Details</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredLogs.map((log) => (
									<TableRow
										key={log.id}
										className="hover:bg-muted/50 cursor-pointer"
										onClick={() => setSelectedLog(log)}
									>
										<TableCell>
											<div className="text-sm">
												{new Date(log.createdAt).toLocaleString()}
											</div>
										</TableCell>
										<TableCell>
											<div>
												<div className="font-medium">
													{log.adminName || 'Unknown'}
												</div>
												<div className="text-muted-foreground text-xs">
													{log.adminEmail}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={getActionBadgeVariant(log.action)}>
												{log.action}
											</Badge>
										</TableCell>
										<TableCell>
											{log.resourceType && (
												<div className="flex items-center gap-1">
													{getResourceIcon(log.resourceType)}
													<span className="text-sm">{log.resourceType}</span>
												</div>
											)}
											{log.resourceId && (
												<div className="text-muted-foreground text-xs">
													{log.resourceId.substring(0, 8)}...
												</div>
											)}
										</TableCell>
										<TableCell>
											<div className="text-muted-foreground text-sm">
												{log.ipAddress || '-'}
											</div>
										</TableCell>
										<TableCell>
											{log.changes && (
												<Badge variant="outline" className="text-xs">
													{Object.keys(log.changes).length} changes
												</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								Page {currentPage} of {totalPages}
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									disabled={currentPage === totalPages}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Detail Modal */}
			{selectedLog && (
				<Card>
					<CardHeader>
						<CardTitle>Log Details</CardTitle>
						<CardDescription>
							Full details for audit log entry {selectedLog.id}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label>Admin</Label>
									<p className="text-sm">
										{selectedLog.adminName} ({selectedLog.adminEmail})
									</p>
								</div>
								<div>
									<Label>Timestamp</Label>
									<p className="text-sm">
										{new Date(selectedLog.createdAt).toLocaleString()}
									</p>
								</div>
								<div>
									<Label>Action</Label>
									<p className="text-sm">{selectedLog.action}</p>
								</div>
								<div>
									<Label>Resource</Label>
									<p className="text-sm">
										{selectedLog.resourceType} - {selectedLog.resourceId}
									</p>
								</div>
								<div>
									<Label>IP Address</Label>
									<p className="text-sm">{selectedLog.ipAddress || 'N/A'}</p>
								</div>
								<div>
									<Label>User Agent</Label>
									<p className="text-sm text-xs">
										{selectedLog.userAgent || 'N/A'}
									</p>
								</div>
							</div>
							{selectedLog.changes && (
								<div>
									<Label>Changes</Label>
									<pre className="bg-muted mt-2 rounded p-2 text-xs">
										{JSON.stringify(selectedLog.changes, null, 2)}
									</pre>
								</div>
							)}
							<Button
								variant="outline"
								onClick={() => setSelectedLog(null)}
								className="w-full"
							>
								Close
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
