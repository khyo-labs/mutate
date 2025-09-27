import { createFileRoute } from '@tanstack/react-router';
import {
	Archive,
	Calendar,
	CheckCircle,
	Clock,
	Download,
	FileDown,
	FileJson,
	FileSpreadsheet,
	FileUp,
	HardDrive,
	RefreshCw,
	Shield,
	Upload,
} from 'lucide-react';
import { useState } from 'react';

import { SettingsHeader } from '@/components/settings/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const Route = createFileRoute('/settings/workspace/export')({
	component: ExportComponent,
});

interface BackupSchedule {
	frequency: 'daily' | 'weekly' | 'monthly' | 'never';
	time: string;
	retention: number;
	enabled: boolean;
}

interface BackupHistory {
	id: string;
	date: string;
	size: string;
	status: 'completed' | 'failed' | 'in_progress';
	type: 'manual' | 'scheduled';
}

interface ExportOptions {
	configurations: boolean;
	apiKeys: boolean;
	webhooks: boolean;
	members: boolean;
	transformationHistory: boolean;
	auditLogs: boolean;
}

function formatFileSize(bytes: number) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function ExportDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [exportOptions, setExportOptions] = useState<ExportOptions>({
		configurations: true,
		apiKeys: false,
		webhooks: true,
		members: true,
		transformationHistory: false,
		auditLogs: false,
	});
	const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
	const [isExporting, setIsExporting] = useState(false);

	function handleExport() {
		setIsExporting(true);
		// Simulate export
		setTimeout(() => {
			setIsExporting(false);
			onOpenChange(false);
		}, 2000);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Export Workspace Data</DialogTitle>
					<DialogDescription>
						Select the data you want to export from your workspace.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Export Format</Label>
						<Select
							value={exportFormat}
							onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="json">
									<div className="flex items-center gap-2">
										<FileJson className="h-4 w-4" />
										JSON (Recommended)
									</div>
								</SelectItem>
								<SelectItem value="csv">
									<div className="flex items-center gap-2">
										<FileSpreadsheet className="h-4 w-4" />
										CSV (Limited data types)
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Separator />

					<div className="space-y-3">
						<Label>Data to Export</Label>
						<div className="space-y-2">
							{Object.entries({
								configurations: 'Transformation Configurations',
								apiKeys: 'API Keys (Encrypted)',
								webhooks: 'Webhook Settings',
								members: 'Team Members & Permissions',
								transformationHistory: 'Transformation History (Last 90 days)',
								auditLogs: 'Audit Logs',
							}).map(([key, label]) => (
								<div key={key} className="flex items-center space-x-2">
									<Checkbox
										id={key}
										checked={exportOptions[key as keyof ExportOptions]}
										onCheckedChange={(checked: boolean) =>
											setExportOptions({
												...exportOptions,
												[key]: checked,
											})
										}
									/>
									<Label
										htmlFor={key}
										className="cursor-pointer text-sm font-normal"
									>
										{label}
									</Label>
								</div>
							))}
						</div>
					</div>

					<div className="bg-muted rounded-lg p-3">
						<p className="text-muted-foreground text-sm">
							<Shield className="mr-1 inline h-4 w-4" />
							Your export will be encrypted and available for download for 24
							hours.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? (
							<>
								<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
								Exporting...
							</>
						) : (
							<>
								<Download className="mr-2 h-4 w-4" />
								Export Data
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ImportDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [isImporting, setIsImporting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	function handleImport() {
		setIsImporting(true);
		let progress = 0;
		const interval = setInterval(() => {
			progress += 10;
			setUploadProgress(progress);
			if (progress >= 100) {
				clearInterval(interval);
				setTimeout(() => {
					setIsImporting(false);
					setUploadProgress(0);
					onOpenChange(false);
				}, 500);
			}
		}, 200);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Import Workspace Data</DialogTitle>
					<DialogDescription>
						Upload a previously exported workspace backup to restore data.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="rounded-lg border-2 border-dashed p-8 text-center">
						<Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
						<p className="mb-1 text-sm font-medium">
							Drop your backup file here or click to browse
						</p>
						<p className="text-muted-foreground text-xs">
							Supports JSON and CSV formats (max 100MB)
						</p>
						<Button variant="outline" className="mt-4">
							Select File
						</Button>
					</div>

					{isImporting && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Uploading...</span>
								<span>{uploadProgress}%</span>
							</div>
							<Progress value={uploadProgress} />
						</div>
					)}

					<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
						<p className="text-sm text-yellow-800">
							⚠️ Importing will merge data with existing workspace data.
							Conflicts will be resolved by keeping the most recent version.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleImport} disabled={isImporting}>
						{isImporting ? (
							<>
								<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
								Importing...
							</>
						) : (
							<>
								<Upload className="mr-2 h-4 w-4" />
								Import Data
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function BackupHistoryTable({ history }: { history: BackupHistory[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Date</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Size</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{history.map((backup) => (
					<TableRow key={backup.id}>
						<TableCell>
							<div className="flex items-center gap-2">
								<Calendar className="text-muted-foreground h-4 w-4" />
								{new Date(backup.date).toLocaleString()}
							</div>
						</TableCell>
						<TableCell>
							<Badge
								variant={backup.type === 'scheduled' ? 'secondary' : 'outline'}
							>
								{backup.type === 'scheduled' ? 'Automatic' : 'Manual'}
							</Badge>
						</TableCell>
						<TableCell>{backup.size}</TableCell>
						<TableCell>
							{backup.status === 'completed' && (
								<Badge
									variant="outline"
									className="border-green-600 text-green-600"
								>
									<CheckCircle className="mr-1 h-3 w-3" />
									Completed
								</Badge>
							)}
							{backup.status === 'in_progress' && (
								<Badge variant="secondary">
									<Clock className="mr-1 h-3 w-3" />
									In Progress
								</Badge>
							)}
							{backup.status === 'failed' && (
								<Badge variant="destructive">Failed</Badge>
							)}
						</TableCell>
						<TableCell className="text-right">
							<Button
								variant="ghost"
								size="sm"
								disabled={backup.status !== 'completed'}
							>
								<Download className="h-4 w-4" />
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function ExportComponent() {
	const { activeWorkspace } = useWorkspaceStore();
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);

	const [backupSchedule] = useState<BackupSchedule>({
		frequency: 'weekly',
		time: '02:00',
		retention: 30,
		enabled: true,
	});

	const mockHistory: BackupHistory[] = [
		{
			id: '1',
			date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			size: formatFileSize(2456789),
			status: 'completed',
			type: 'scheduled',
		},
		{
			id: '2',
			date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
			size: formatFileSize(2234567),
			status: 'completed',
			type: 'scheduled',
		},
		{
			id: '3',
			date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
			size: formatFileSize(1987654),
			status: 'completed',
			type: 'manual',
		},
	];

	if (!activeWorkspace) {
		return null;
	}

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Export & Backup"
				description="Export your workspace data and manage automatic backups"
			/>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Last Backup</CardTitle>
						<Archive className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">2 days ago</div>
						<p className="text-muted-foreground text-xs">
							Automatic backup completed
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Backup Size
						</CardTitle>
						<HardDrive className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">6.7 MB</div>
						<p className="text-muted-foreground text-xs">
							Across 3 backup files
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Next Backup</CardTitle>
						<Clock className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">5 days</div>
						<p className="text-muted-foreground text-xs">
							Scheduled for{' '}
							{new Date(
								Date.now() + 5 * 24 * 60 * 60 * 1000,
							).toLocaleDateString()}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileDown className="h-5 w-5" />
							Export Data
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground text-sm">
							Export your workspace data including configurations, settings, and
							team information.
						</p>
						<Button
							onClick={() => setExportDialogOpen(true)}
							className="w-full"
						>
							<Download className="mr-2 h-4 w-4" />
							Export Workspace Data
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileUp className="h-5 w-5" />
							Import Data
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground text-sm">
							Restore workspace data from a previous export or migrate from
							another workspace.
						</p>
						<Button
							onClick={() => setImportDialogOpen(true)}
							variant="outline"
							className="w-full"
						>
							<Upload className="mr-2 h-4 w-4" />
							Import Backup File
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Automatic Backups</span>
						<Badge
							variant={backupSchedule.enabled ? 'default' : 'secondary'}
							className={
								backupSchedule.enabled ? 'bg-green-500 hover:bg-green-600' : ''
							}
						>
							{backupSchedule.enabled ? 'Enabled' : 'Disabled'}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label>Frequency</Label>
							<Select defaultValue={backupSchedule.frequency}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="daily">Daily</SelectItem>
									<SelectItem value="weekly">Weekly</SelectItem>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="never">Never</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Backup Time</Label>
							<Select defaultValue={backupSchedule.time}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="00:00">12:00 AM</SelectItem>
									<SelectItem value="02:00">2:00 AM</SelectItem>
									<SelectItem value="04:00">4:00 AM</SelectItem>
									<SelectItem value="06:00">6:00 AM</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Retention Period</Label>
							<Select defaultValue={backupSchedule.retention.toString()}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="7">7 days</SelectItem>
									<SelectItem value="30">30 days</SelectItem>
									<SelectItem value="90">90 days</SelectItem>
									<SelectItem value="365">1 year</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<Button>Save Backup Settings</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Backup History</CardTitle>
				</CardHeader>
				<CardContent>
					<BackupHistoryTable history={mockHistory} />
				</CardContent>
			</Card>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
			/>
			<ImportDialog
				open={importDialogOpen}
				onOpenChange={setImportDialogOpen}
			/>
		</div>
	);
}
