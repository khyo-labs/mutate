import { formatDistanceToNow } from 'date-fns';
import {
	ChevronDown,
	Clock,
	Download,
	FileInput,
	FileOutput,
	FileText,
	Loader2,
} from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobDownload, useRecentJobs } from '@/hooks/use-jobs';
import { formatDuration, formatFileSize } from '@/lib/format';

type RunHistoryProps = {
	configurationId: string;
};

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
					<Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5" disabled={isPending}>
						{isPending ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Download className="h-3.5 w-3.5" />
						)}
						Download
						<ChevronDown className="h-3 w-3" />
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
			size="sm"
			className="h-8 shrink-0 gap-1.5"
			onClick={() => handleDownload(hasInput ? 'input' : 'output')}
			disabled={isPending}
		>
			{isPending ? (
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
			) : (
				<Download className="h-3.5 w-3.5" />
			)}
			Download
		</Button>
	);
}

export function RunHistory({ configurationId }: RunHistoryProps) {
	const { data: jobsData, isLoading } = useRecentJobs({
		configurationId,
		limit: 10,
	});
	const jobs = jobsData?.data || [];

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Run History</CardTitle>
					<CardDescription>Recent transformation runs</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
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
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Run History</CardTitle>
				<CardDescription>{jobsData?.pagination?.total || 0} total runs</CardDescription>
			</CardHeader>
			<CardContent>
				{jobs.length === 0 ? (
					<div className="py-12 text-center">
						<div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
							<Clock className="text-muted-foreground h-8 w-8" />
						</div>
						<h3 className="text-foreground mb-1 font-semibold">No runs yet</h3>
						<p className="text-muted-foreground text-sm">
							Execute a transformation to see results here.
						</p>
					</div>
				) : (
					<div className="divide-border divide-y">
						{jobs.map((job) => (
							<div
								key={job.id}
								className="hover:bg-muted/50 flex items-center justify-between gap-3 px-1 py-3 transition-colors"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<StatusBadge status={job.status} />
										{job.originalFileName && (
											<span className="text-foreground flex items-center gap-1 truncate text-sm font-medium">
												<FileText className="h-3.5 w-3.5 shrink-0" />
												{job.originalFileName}
											</span>
										)}
									</div>
									<div className="text-muted-foreground mt-1.5 flex items-center gap-4 text-xs">
										{job.fileSize && <span>{formatFileSize(job.fileSize)}</span>}
										{job.durationMs !== null && (
											<span className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{formatDuration(job.durationMs)}
											</span>
										)}
										<span>
											{formatDistanceToNow(new Date(job.createdAt), {
												addSuffix: true,
											})}
										</span>
										{job.errorMessage && (
											<span className="text-destructive truncate">{job.errorMessage}</span>
										)}
									</div>
								</div>

								{job.status === 'completed' && (job.outputFileKey || job.inputFileKey) && (
									<DownloadActions
										configurationId={configurationId}
										jobId={job.id}
										hasInput={!!job.inputFileKey}
										hasOutput={!!job.outputFileKey}
									/>
								)}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
