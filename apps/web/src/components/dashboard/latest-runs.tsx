import { formatDistanceToNow } from 'date-fns';
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Download,
	FileText,
	Loader2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobDownload, useRecentJobs } from '@/hooks/use-jobs';

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
	if (status === 'completed') {
		return (
			<Badge
				variant="default"
				className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
			>
				<CheckCircle2 className="mr-1 h-3 w-3" />
				Done
			</Badge>
		);
	}
	if (status === 'failed') {
		return (
			<Badge
				variant="destructive"
				className="bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
			>
				<AlertCircle className="mr-1 h-3 w-3" />
				Failed
			</Badge>
		);
	}
	if (status === 'processing') {
		return (
			<Badge
				variant="secondary"
				className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
			>
				<Loader2 className="mr-1 h-3 w-3 animate-spin" />
				Running
			</Badge>
		);
	}
	return (
		<Badge variant="secondary">
			<Clock className="mr-1 h-3 w-3" />
			Pending
		</Badge>
	);
}

function DownloadButton({
	configurationId,
	jobId,
}: {
	configurationId: string;
	jobId: string;
}) {
	const { mutate: download, isPending } = useJobDownload();

	function handleDownload() {
		download(
			{ mutationId: configurationId, jobId },
			{
				onSuccess: (response) => {
					if (response.data?.downloadUrl) {
						window.open(response.data.downloadUrl, '_blank');
					}
				},
			},
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className="h-7 w-7"
			onClick={handleDownload}
			disabled={isPending}
		>
			{isPending ? (
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
			) : (
				<Download className="h-3.5 w-3.5" />
			)}
		</Button>
	);
}

export function LatestRuns() {
	const { data: jobsData, isLoading } = useRecentJobs({ limit: 5 });
	const jobs = jobsData?.data || [];

	if (isLoading) {
		return (
			<div className="space-y-3 p-1">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="flex items-center gap-3 p-3">
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-3 w-48" />
						</div>
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
				))}
			</div>
		);
	}

	if (jobs.length === 0) {
		return (
			<div className="text-muted-foreground py-12 text-center text-sm">
				No transformation runs yet
			</div>
		);
	}

	return (
		<div className="divide-border divide-y">
			{jobs.map((job) => (
				<div
					key={job.id}
					className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
				>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="text-foreground truncate text-sm font-medium">
								{job.configurationName || 'Unknown pipeline'}
							</span>
							<StatusBadge status={job.status} />
						</div>
						<div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
							{job.originalFileName && (
								<span className="flex items-center gap-1 truncate">
									<FileText className="h-3 w-3 shrink-0" />
									{job.originalFileName}
								</span>
							)}
							{job.fileSize && (
								<span className="shrink-0">
									{formatFileSize(job.fileSize)}
								</span>
							)}
							{job.durationMs !== null && (
								<span className="shrink-0">
									{formatDuration(job.durationMs)}
								</span>
							)}
							<span className="shrink-0">
								{formatDistanceToNow(new Date(job.createdAt), {
									addSuffix: true,
								})}
							</span>
						</div>
					</div>

					{job.status === 'completed' && job.outputFileKey && (
						<DownloadButton
							configurationId={job.configurationId}
							jobId={job.id}
						/>
					)}
				</div>
			))}
		</div>
	);
}
