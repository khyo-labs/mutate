import { apiRequest } from './client';

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

export const orgApi = {
	create: async function (
		data: CreateOrganizationRequest,
	): Promise<Organization> {
		const response = await apiRequest<Organization>(
			'POST',
			'/v1/organizations/create',
			data,
		);
		return response;
	},

	isSlugAvailable: async function (slug: string): Promise<boolean> {
		const response = await apiRequest<SlugStatus>(
			'POST',
			'/v1/organizations/exists',
			{
				slug,
			},
		);
		return response.status;
	},
};
