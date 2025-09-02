import { toast } from 'sonner';

import type { ApiResponse, SuccessResponse } from '@/types';

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

export const workspaceApi = {
	create: async function (data: CreateWorkspaceRequest): Promise<Workspace> {
		const response = await api.post<SuccessResponse<Workspace>>(
			'/v1/workspaces/create',
			data,
		);
		return response.data;
	},

	list: async function (): Promise<Workspace[]> {
		const response =
			await api.get<SuccessResponse<Workspace[]>>('/v1/workspaces');
		return response.data;
	},

	isSlugAvailable: async function (slug: string): Promise<boolean> {
		const response = await api.post<ApiResponse<SlugStatus>>(
			'/v1/workspaces/exists',
			{
				slug,
			},
		);
		if (!response.success) {
			toast.error(response.error.message);
			return false;
		}
		return response.data.status;
	},
};
