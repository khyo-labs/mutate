import { toast } from 'sonner';

import type {
	ApiResponse,
	Configuration,
	PaginatedResponse,
	SuccessResponse,
	Webhook,
} from '@/types';

import type { ApiKey } from './api-keys';
import { api } from './client';

export type CreateWorkspaceRequest = {
	name: string;
	slug: string;
	companySize?: string;
	userRole?: string;
};

export type Workspace = {
	id: string;
	name: string;
	slug: string;
	logo?: string;
	metadata?: Record<string, string>;
	createdAt: string;
	updatedAt: string;
};

export type SlugStatus = {
	status: boolean;
};

export type NameAvailabilityStatus = {
	available: boolean;
};

export type UpdateWorkspaceRequest = {
	name?: string;
	slug?: string;
	logo?: string;
	metadata?: Record<string, string>;
};

interface ConfigurationQuery {
	page?: number;
	limit?: number;
	search?: string;
}

export const workspaceApi = {
	create: async function (data: CreateWorkspaceRequest): Promise<Workspace> {
		const response = await api.post<SuccessResponse<Workspace>>('/v1/workspace/create', data);
		return response.data;
	},

	list: async function (): Promise<Workspace[]> {
		const response = await api.get<SuccessResponse<Workspace[]>>('/v1/workspace');
		return response.data;
	},

	get: async function (workspaceId: string): Promise<Workspace> {
		const response = await api.get<SuccessResponse<Workspace>>(`/v1/workspace/${workspaceId}`);
		return response.data;
	},

	getMutations: async function (
		workspaceId: string,
		params?: ConfigurationQuery,
	): Promise<PaginatedResponse<Configuration>> {
		const searchParams = new URLSearchParams();

		if (params?.page) searchParams.append('page', params.page.toString());
		if (params?.limit) searchParams.append('limit', params.limit.toString());
		if (params?.search) searchParams.append('search', params.search);

		let url = `/v1/workspace/${workspaceId}/configuration`;

		if (searchParams.toString()) {
			url += `?${searchParams.toString()}`;
		}
		const response = await api.get<PaginatedResponse<Configuration>>(url);

		if (!response.success) {
			toast.error('Failed to list configurations');
		}

		return response;
	},

	getApiKeys: async function (workspaceId: string): Promise<ApiKey[]> {
		const response = await api.get<SuccessResponse<ApiKey[]>>(
			`/v1/workspace/${workspaceId}/api-keys`,
		);
		return response.data;
	},

	getWebhooks: async function (workspaceId: string): Promise<Webhook[]> {
		const response = await api.get<SuccessResponse<Webhook[]>>(
			`/v1/workspace/${workspaceId}/webhooks`,
		);
		return response.data;
	},

	isSlugAvailable: async function (slug: string): Promise<boolean> {
		const response = await api.post<ApiResponse<SlugStatus>>('/v1/workspace/exists', {
			slug,
		});
		if (!response.success) {
			toast.error(response.error.message);
			return false;
		}
		return response.data.status;
	},

	isNameAvailable: async function (name: string, workspaceId?: string): Promise<boolean> {
		const response = await api.post<ApiResponse<NameAvailabilityStatus>>(
			'/v1/workspace/name-exists',
			{
				name,
				workspaceId,
			},
		);

		if (!response.success) {
			toast.error(response.error.message);
			return false;
		}

		return response.data.available;
	},

	update: async function (workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
		const response = await api.patch<SuccessResponse<Workspace>>(
			`/v1/workspace/${workspaceId}`,
			data,
		);
		return response.data;
	},

	delete: async function (workspaceId: string): Promise<SuccessResponse<null>> {
		const response = await api.delete<SuccessResponse<null>>(`/v1/workspace/${workspaceId}`);
		return response;
	},
};
