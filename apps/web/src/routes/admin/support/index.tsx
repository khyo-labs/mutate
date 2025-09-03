import { createFileRoute } from '@tanstack/react-router';
import {
	Bug,
	Database,
	Download,
	FileCode,
	Key,
	Loader2,
	RefreshCw,
	Search,
	Send,
	Settings,
	Terminal,
	Trash2,
	Upload,
	User,
	Wrench,
} from 'lucide-react';
import { useState } from 'react';
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/admin/support/')({
	component: SupportTools,
});

function SupportTools() {
	const [loading, setLoading] = useState(false);
	const [impersonateUserId, setImpersonateUserId] = useState('');
	const [workspaceId, setWorkspaceId] = useState('');
	const [debugMode, setDebugMode] = useState(false);
	const [showExportModal, setShowExportModal] = useState(false);
	const [exportFormat, setExportFormat] = useState('json');
	const [jobId, setJobId] = useState('');
	const [cacheKey, setCacheKey] = useState('');
	const [queryInput, setQueryInput] = useState('');
	const [queryResult, setQueryResult] = useState('');

	async function impersonateUser() {
		if (!impersonateUserId) {
			toast.error('Please enter a user ID');
			return;
		}

		try {
			setLoading(true);
			const response = await api.post(
				`/v1/admin/support/impersonate/${impersonateUserId}`,
			);

			if (response.data.sessionToken) {
				sessionStorage.setItem(
					'impersonation_token',
					response.data.sessionToken,
				);
				sessionStorage.setItem('impersonation_user', impersonateUserId);
				toast.success('Impersonation started - redirecting...');
				setTimeout(() => {
					window.location.href = '/';
				}, 1000);
			}
		} catch (error) {
			toast.error('Failed to impersonate user');
		} finally {
			setLoading(false);
		}
	}

	async function exportWorkspaceData() {
		if (!workspaceId) {
			toast.error('Please enter a workspace ID');
			return;
		}

		try {
			setLoading(true);
			const response = await api.get(
				`/v1/admin/support/export/workspace/${workspaceId}?format=${exportFormat}`,
				{
					responseType: 'blob',
				},
			);

			// Create download link
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute(
				'download',
				`workspace-${workspaceId}-${Date.now()}.${exportFormat}`,
			);
			document.body.appendChild(link);
			link.click();
			link.remove();

			toast.success('Workspace data exported successfully');
			setShowExportModal(false);
		} catch (error) {
			toast.error('Failed to export workspace data');
		} finally {
			setLoading(false);
		}
	}

	async function toggleDebugMode() {
		if (!workspaceId) {
			toast.error('Please enter a workspace ID');
			return;
		}

		try {
			setLoading(true);
			await api.post(`/v1/admin/support/debug-mode`, {
				workspaceId,
				enabled: !debugMode,
			});
			setDebugMode(!debugMode);
			toast.success(
				`Debug mode ${!debugMode ? 'enabled' : 'disabled'} for workspace`,
			);
		} catch (error) {
			toast.error('Failed to toggle debug mode');
		} finally {
			setLoading(false);
		}
	}

	async function retryJob() {
		if (!jobId) {
			toast.error('Please enter a job ID');
			return;
		}

		try {
			setLoading(true);
			await api.post(`/v1/admin/support/retry-job/${jobId}`);
			toast.success('Job retry initiated');
			setJobId('');
		} catch (error) {
			toast.error('Failed to retry job');
		} finally {
			setLoading(false);
		}
	}

	async function clearCache() {
		try {
			setLoading(true);
			const endpoint = cacheKey
				? `/v1/admin/support/cache/clear?key=${cacheKey}`
				: '/v1/admin/support/cache/clear';
			await api.post(endpoint);
			toast.success(cacheKey ? 'Cache key cleared' : 'All cache cleared');
			setCacheKey('');
		} catch (error) {
			toast.error('Failed to clear cache');
		} finally {
			setLoading(false);
		}
	}

	async function executeQuery() {
		if (!queryInput) {
			toast.error('Please enter a query');
			return;
		}

		try {
			setLoading(true);
			const response = await api.post('/v1/admin/support/query', {
				query: queryInput,
			});
			setQueryResult(JSON.stringify(response.data.result, null, 2));
			toast.success('Query executed successfully');
		} catch (error: any) {
			setQueryResult(
				`Error: ${error.response?.data?.error?.message || error.message}`,
			);
			toast.error('Query failed');
		} finally {
			setLoading(false);
		}
	}

	async function endImpersonation() {
		sessionStorage.removeItem('impersonation_token');
		sessionStorage.removeItem('impersonation_user');
		toast.success('Impersonation ended');
		window.location.href = '/admin/support';
	}

	// Check if currently impersonating
	const currentImpersonation = sessionStorage.getItem('impersonation_user');

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Support Tools</h2>
				<p className="text-muted-foreground">
					Administrative tools for debugging and support
				</p>
			</div>

			{currentImpersonation && (
				<Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<User className="h-4 w-4" />
								<CardTitle className="text-sm">
									Currently Impersonating
								</CardTitle>
							</div>
							<Button size="sm" variant="outline" onClick={endImpersonation}>
								End Impersonation
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-sm">User ID: {currentImpersonation}</p>
					</CardContent>
				</Card>
			)}

			<Tabs defaultValue="impersonation" className="space-y-4">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="impersonation">Impersonation</TabsTrigger>
					<TabsTrigger value="data">Data Export</TabsTrigger>
					<TabsTrigger value="debug">Debug Tools</TabsTrigger>
					<TabsTrigger value="cache">Cache</TabsTrigger>
					<TabsTrigger value="database">Database</TabsTrigger>
				</TabsList>

				<TabsContent value="impersonation" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>User Impersonation</CardTitle>
							<CardDescription>
								Log in as a user to debug their issues. Use with caution.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="userId">User ID or Email</Label>
								<div className="flex gap-2">
									<Input
										id="userId"
										placeholder="Enter user ID or email"
										value={impersonateUserId}
										onChange={(e) => setImpersonateUserId(e.target.value)}
									/>
									<Button onClick={impersonateUser} disabled={loading}>
										{loading ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Key className="mr-2 h-4 w-4" />
										)}
										Impersonate
									</Button>
								</div>
								<p className="text-muted-foreground text-xs">
									This action will be logged in the audit trail
								</p>
							</div>

							<Separator />

							<div className="bg-muted rounded-lg p-4">
								<h4 className="mb-2 text-sm font-medium">Important Notes:</h4>
								<ul className="text-muted-foreground space-y-1 text-xs">
									<li>
										• All actions performed will be attributed to the user
									</li>
									<li>
										• Your session will be replaced with the user's session
									</li>
									<li>• Remember to end impersonation when done</li>
									<li>• This feature is for debugging purposes only</li>
								</ul>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="data" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Workspace Data Export</CardTitle>
							<CardDescription>
								Export all data for a workspace for compliance or debugging
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="workspaceExport">Workspace ID</Label>
								<div className="flex gap-2">
									<Input
										id="workspaceExport"
										placeholder="Enter workspace ID"
										value={workspaceId}
										onChange={(e) => setWorkspaceId(e.target.value)}
									/>
									<Button onClick={() => setShowExportModal(true)}>
										<Download className="mr-2 h-4 w-4" />
										Export Data
									</Button>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-sm">Quick Actions</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2">
										<Button
											variant="outline"
											className="w-full justify-start"
											size="sm"
										>
											<FileCode className="mr-2 h-4 w-4" />
											Export Configurations
										</Button>
										<Button
											variant="outline"
											className="w-full justify-start"
											size="sm"
										>
											<Database className="mr-2 h-4 w-4" />
											Export Usage Data
										</Button>
										<Button
											variant="outline"
											className="w-full justify-start"
											size="sm"
										>
											<User className="mr-2 h-4 w-4" />
											Export Member List
										</Button>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-sm">Bulk Operations</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2">
										<Button
											variant="outline"
											className="w-full justify-start"
											size="sm"
										>
											<Upload className="mr-2 h-4 w-4" />
											Import Configurations
										</Button>
										<Button
											variant="outline"
											className="w-full justify-start"
											size="sm"
										>
											<RefreshCw className="mr-2 h-4 w-4" />
											Reset Workspace
										</Button>
										<Button
											variant="outline"
											className="w-full justify-start text-red-600"
											size="sm"
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Delete Workspace
										</Button>
									</CardContent>
								</Card>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="debug" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Debug Mode</CardTitle>
							<CardDescription>
								Enable verbose logging and debugging features for a workspace
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="debugWorkspace">Workspace ID</Label>
								<div className="flex gap-2">
									<Input
										id="debugWorkspace"
										placeholder="Enter workspace ID"
										value={workspaceId}
										onChange={(e) => setWorkspaceId(e.target.value)}
									/>
									<div className="flex items-center gap-2">
										<Switch
											checked={debugMode}
											onCheckedChange={toggleDebugMode}
										/>
										<Label>Debug Mode</Label>
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-2">
								<Label htmlFor="jobRetry">Retry Failed Job</Label>
								<div className="flex gap-2">
									<Input
										id="jobRetry"
										placeholder="Enter job ID"
										value={jobId}
										onChange={(e) => setJobId(e.target.value)}
									/>
									<Button onClick={retryJob} disabled={loading}>
										<RefreshCw className="mr-2 h-4 w-4" />
										Retry Job
									</Button>
								</div>
							</div>

							<div className="bg-muted rounded-lg p-4">
								<h4 className="mb-2 text-sm font-medium">Debug Features:</h4>
								<ul className="text-muted-foreground space-y-1 text-xs">
									<li>• Verbose API response logging</li>
									<li>• Detailed error messages</li>
									<li>• Performance timing information</li>
									<li>• Database query logging</li>
								</ul>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="cache" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Cache Management</CardTitle>
							<CardDescription>
								Clear application cache for troubleshooting
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="cacheKey">Cache Key (optional)</Label>
								<div className="flex gap-2">
									<Input
										id="cacheKey"
										placeholder="Enter specific cache key or leave empty for all"
										value={cacheKey}
										onChange={(e) => setCacheKey(e.target.value)}
									/>
									<Button
										onClick={clearCache}
										disabled={loading}
										variant="destructive"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Clear Cache
									</Button>
								</div>
								<p className="text-muted-foreground text-xs">
									Leave empty to clear all cache
								</p>
							</div>

							<div className="grid gap-2">
								<Button variant="outline" className="justify-start">
									<Database className="mr-2 h-4 w-4" />
									Clear Query Cache
								</Button>
								<Button variant="outline" className="justify-start">
									<FileCode className="mr-2 h-4 w-4" />
									Clear Configuration Cache
								</Button>
								<Button variant="outline" className="justify-start">
									<User className="mr-2 h-4 w-4" />
									Clear Session Cache
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="database" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Database Query Tool</CardTitle>
							<CardDescription>
								Execute read-only queries for debugging (SELECT only)
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="query">SQL Query</Label>
								<Textarea
									id="query"
									placeholder="SELECT * FROM organization LIMIT 10;"
									value={queryInput}
									onChange={(e) => setQueryInput(e.target.value)}
									rows={5}
									className="font-mono text-sm"
								/>
								<Button onClick={executeQuery} disabled={loading}>
									<Terminal className="mr-2 h-4 w-4" />
									Execute Query
								</Button>
							</div>

							{queryResult && (
								<div className="space-y-2">
									<Label>Result</Label>
									<pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs">
										{queryResult}
									</pre>
								</div>
							)}

							<div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950/20">
								<h4 className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
									⚠️ Warning
								</h4>
								<p className="text-xs text-yellow-700 dark:text-yellow-300">
									Only SELECT queries are allowed. All queries are logged in the
									audit trail. Use with extreme caution.
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Export Modal */}
			<Dialog open={showExportModal} onOpenChange={setShowExportModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Export Workspace Data</DialogTitle>
						<DialogDescription>
							Choose the format for the workspace data export
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="format">Export Format</Label>
							<Select value={exportFormat} onValueChange={setExportFormat}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="json">JSON</SelectItem>
									<SelectItem value="csv">CSV</SelectItem>
									<SelectItem value="zip">ZIP Archive</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="bg-muted rounded-lg p-3">
							<p className="text-muted-foreground text-xs">
								This will export all data including:
							</p>
							<ul className="text-muted-foreground mt-2 space-y-1 text-xs">
								<li>• Workspace configuration</li>
								<li>• All mutations/configurations</li>
								<li>• Member list and roles</li>
								<li>• Usage history</li>
								<li>• API keys (hashed)</li>
							</ul>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowExportModal(false)}>
							Cancel
						</Button>
						<Button onClick={exportWorkspaceData} disabled={loading}>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Export
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
