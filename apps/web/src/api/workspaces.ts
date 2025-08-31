import { toast } from 'sonner';

import type { ApiResponse } from '@/types';

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
		const response = await api.post<ApiResponse<Workspace>>(
			'/v1/workspaces/create',
			data,
		);
		if (!response.success) {
			toast.error('Failed to create workspace');
			return {} as Workspace;
		}
		return response.data;
	},

	list: async function (): Promise<Workspace[]> {
		console.log('list');
		const response = await api.get<ApiResponse<Workspace[]>>('/v1/workspaces');
		if (!response.success) {
			toast.error('Failed to list workspaces');
			return [] as Workspace[];
		}
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
			toast.error('Failed to check slug availability');
			return false;
		}
		return response.data.status;
	},
};
