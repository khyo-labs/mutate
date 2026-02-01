import { formatDistanceToNow } from 'date-fns';
import { Download, FileInput, FileOutput, FileText, Loader2 } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobDownload, useRecentJobs } from '@/hooks/use-jobs';
import { formatDuration, formatFileSize } from '@/lib/format';

function DownloadActions({
	configurationId,
	jobId,
	hasInput,
	hasOutput,
}: {
	configurationId: string;
	jobId: string;
	hasInput: boolean;
	hasOutput: boolean;
}) {
	const { mutate: download, isPending } = useJobDownload();

	function handleDownload(type: 'input' | 'output') {
		download(
			{ mutationId: configurationId, jobId, type },
			{
				onSuccess: (response) => {
					if (response.data?.downloadUrl) {
						window.open(response.data.downloadUrl, '_blank');
					}
				},
			},
		);
	}

	if (hasInput && hasOutput) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
						{isPending ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Download className="h-3.5 w-3.5" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => handleDownload('input')}>
						<FileInput className="h-4 w-4" />
						Original File
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleDownload('output')}>
						<FileOutput className="h-4 w-4" />
						Converted File
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className="h-7 w-7"
			onClick={() => handleDownload(hasInput ? 'input' : 'output')}
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
							<StatusBadge status={job.status} compact />
						</div>
						<div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
							{job.originalFileName && (
								<span className="flex items-center gap-1 truncate">
									<FileText className="h-3 w-3 shrink-0" />
									{job.originalFileName}
								</span>
							)}
							{job.fileSize && <span className="shrink-0">{formatFileSize(job.fileSize)}</span>}
							{job.durationMs !== null && (
								<span className="shrink-0">{formatDuration(job.durationMs)}</span>
							)}
							<span className="shrink-0">
								{formatDistanceToNow(new Date(job.createdAt), {
									addSuffix: true,
								})}
							</span>
						</div>
					</div>

					{job.status === 'completed' && (job.outputFileKey || job.inputFileKey) && (
						<DownloadActions
							configurationId={job.configurationId}
							jobId={job.id}
							hasInput={!!job.inputFileKey}
							hasOutput={!!job.outputFileKey}
						/>
					)}
				</div>
			))}
		</div>
	);
}
