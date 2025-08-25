import type {
	Configuration,
	ConfigurationFormData,
	PaginatedResponse,
} from '../types';
import { apiRequest } from './client';

interface ConfigurationQuery {
	page?: number;
	limit?: number;
	search?: string;
}

export const configurationsApi = {
	list: async (
		params?: ConfigurationQuery,
	): Promise<PaginatedResponse<Configuration>> => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.append('page', params.page.toString());
		if (params?.limit) searchParams.append('limit', params.limit.toString());
		if (params?.search) searchParams.append('search', params.search);

		const url = `/configurations${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
		return apiRequest<PaginatedResponse<Configuration>>('GET', url);
	},

	get: async (id: string): Promise<Configuration> => {
		return apiRequest<Configuration>('GET', `/configurations/${id}`);
	},

	create: async (data: ConfigurationFormData): Promise<Configuration> => {
		return apiRequest<Configuration>('POST', '/configurations', data);
	},

	update: async (
		id: string,
		data: Partial<ConfigurationFormData>,
	): Promise<Configuration> => {
		return apiRequest<Configuration>('PUT', `/configurations/${id}`, data);
	},

	delete: async (id: string): Promise<void> => {
		return apiRequest<void>('DELETE', `/configurations/${id}`);
	},

	clone: async (id: string): Promise<Configuration> => {
		return apiRequest<Configuration>('POST', `/configurations/${id}/clone`);
	},
};
