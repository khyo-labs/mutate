import { api } from './client';

export type CreateOrganizationRequest = {
	name: string;
	slug: string;
	companySize?: string;
	userRole?: string;
};

export type Organization = {
	id: string;
	name: string;
	slug: string;
	createdAt: string;
	updatedAt: string;
};

export type SlugStatus = {
	status: boolean;
};

export const workspaceApi = {
	create: async function (
		data: CreateOrganizationRequest,
	): Promise<Organization> {
		const response = await api.post<Organization>(
			'/v1/organizations/create',
			data,
		);
		return response;
	},

	list: async function (): Promise<Organization[]> {
		const response = await api.get<Organization[]>(
			'/v1/auth/organizations/list',
		);
		return response;
	},

	isSlugAvailable: async function (slug: string): Promise<boolean> {
		const response = await api.post<SlugStatus>('/v1/organizations/exists', {
			slug,
		});
		return response.status;
	},
};
