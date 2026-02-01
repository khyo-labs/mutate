import { useMutation, useQuery } from '@tanstack/react-query';

import { type JobStatsResponse, type JobsListResponse, jobsApi } from '@/api/jobs';
import { useWorkspaceStore } from '@/stores/workspace-store';

type JobsQueryParams = {
	configurationId?: string;
	limit?: number;
	offset?: number;
	status?: string;
};

export function useRecentJobs(params?: JobsQueryParams) {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

	return useQuery<JobsListResponse>({
		queryKey: ['jobs', activeWorkspace?.id, params],
		queryFn: () => jobsApi.getJobs(activeWorkspace!.id, params),
		enabled: !!activeWorkspace,
	});
}

export function useJobStats() {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

	return useQuery<JobStatsResponse>({
		queryKey: ['job-stats', activeWorkspace?.id],
		queryFn: () => jobsApi.getJobStats(activeWorkspace!.id),
		enabled: !!activeWorkspace,
	});
}

export function useJobDownload() {
	return useMutation({
		mutationFn: ({
			mutationId,
			jobId,
			type = 'output',
		}: {
			mutationId: string;
			jobId: string;
			type?: 'input' | 'output';
		}) => jobsApi.getJobDownloadUrl(mutationId, jobId, type),
	});
}
