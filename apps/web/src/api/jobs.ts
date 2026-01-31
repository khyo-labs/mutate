import { api } from './client';

export type TransformationJobListItem = {
	id: string;
	configurationId: string;
	configurationName: string | null;
	status: string;
	originalFileName: string | null;
	fileSize: number | null;
	outputFileKey: string | null;
	errorMessage: string | null;
	startedAt: string | null;
	completedAt: string | null;
	createdBy: string;
	createdAt: string;
	durationMs: number | null;
};

export type JobsListResponse = {
	success: boolean;
	data: TransformationJobListItem[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
	};
};

export type JobStat = {
	configurationId: string;
	name: string | null;
	totalRuns: number;
	successCount: number;
	failedCount: number;
};

export type JobStatsResponse = {
	success: boolean;
	data: JobStat[];
};

export type JobDownloadResponse = {
	success: boolean;
	data: {
		downloadUrl: string;
		fileName: string;
		expiresIn: number;
	};
};

type JobsQueryParams = {
	configurationId?: string;
	limit?: number;
	offset?: number;
	status?: string;
};

export const jobsApi = {
	getJobs: async function (
		workspaceId: string,
		params?: JobsQueryParams,
	): Promise<JobsListResponse> {
		const searchParams = new URLSearchParams();
		if (params?.configurationId)
			searchParams.append('configurationId', params.configurationId);
		if (params?.limit)
			searchParams.append('limit', params.limit.toString());
		if (params?.offset)
			searchParams.append('offset', params.offset.toString());
		if (params?.status) searchParams.append('status', params.status);

		let url = `/v1/workspace/${workspaceId}/jobs`;
		if (searchParams.toString()) {
			url += `?${searchParams.toString()}`;
		}

		return api.get<JobsListResponse>(url);
	},

	getJobStats: async function (
		workspaceId: string,
	): Promise<JobStatsResponse> {
		return api.get<JobStatsResponse>(`/v1/workspace/${workspaceId}/jobs/stats`);
	},

	getJobDownloadUrl: async function (
		mutationId: string,
		jobId: string,
	): Promise<JobDownloadResponse> {
		return api.post<JobDownloadResponse>(
			`/v1/mutate/${mutationId}/jobs/${jobId}/download`,
		);
	},
};
