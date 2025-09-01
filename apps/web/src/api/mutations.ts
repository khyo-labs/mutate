import { toast } from 'sonner';

import type {
	Configuration,
	ConfigurationFormData,
	PaginatedResponse,
	SuccessResponse,
} from '../types';
import { api } from './client';

interface ConfigurationQuery {
	page?: number;
	limit?: number;
	search?: string;
}

export const mutApi = {
	list: async (
		params?: ConfigurationQuery,
	): Promise<PaginatedResponse<Configuration>> => {
		const searchParams = new URLSearchParams();

		if (params?.page) searchParams.append('page', params.page.toString());
		if (params?.limit) searchParams.append('limit', params.limit.toString());
		if (params?.search) searchParams.append('search', params.search);

		let url = '/v1/configurations';

		if (searchParams.toString()) {
			url += `?${searchParams.toString()}`;
		}

		const response = await api.get<PaginatedResponse<Configuration>>(url);

		if (!response.success) {
			toast.error('Failed to list configurations');
		}

		return response;
	},

	get: async (id: string): Promise<Configuration> => {
		const response = await api.get<SuccessResponse<Configuration>>(
			`/v1/configurations/${id}`,
		);

		if (response.success) {
			return response.data;
		}

		toast.error('Failed to get mutation');
		throw new Error('Failed to get mutation');
	},

	create: async (data: ConfigurationFormData): Promise<Configuration> => {
		return api.post<Configuration>('/v1/configurations', data);
	},

	update: async (
		id: string,
		data: Partial<ConfigurationFormData>,
	): Promise<Configuration> => {
		console.log('mutApi.update - Sending data:', data);
		const response = await api.put<SuccessResponse<Configuration>>(
			`/v1/configurations/${id}`,
			data,
		);
		console.log('mutApi.update - Received response:', response);

		return response.data;
	},

	delete: async (id: string): Promise<void> => {
		return api.delete<void>(`/v1/configurations/${id}`);
	},

	clone: async (id: string): Promise<Configuration> => {
		const response = await api.post<SuccessResponse<Configuration>>(
			`/v1/configurations/${id}/clone`,
		);
		return response.data;
	},
};
