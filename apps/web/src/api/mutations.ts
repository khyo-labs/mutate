import { toast } from 'sonner';

import type {
	ApiResponse,
	Configuration,
	ConfigurationFormData,
	PaginatedResponse,
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

		console.log('list configurations response', response);

		if (!response.success) {
			toast.error('Failed to list configurations');
		}

		return response;
	},

	get: async (id: string): Promise<Configuration> => {
		const response = await api.get<ApiResponse<Configuration>>(
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
		try {
			console.log('mutApi.update - Sending data:', data);
			const response = await api.put<ApiResponse<Configuration>>(`/v1/configurations/${id}`, data);
			console.log('mutApi.update - Received response:', response);
			
			if (response.success) {
				return response.data;
			}
			
			console.error('mutApi.update - Response not successful:', response);
			toast.error('Failed to update mutation');
			throw new Error('Failed to update mutation');
		} catch (error: any) {
			console.error('mutApi.update - Error caught:', error);
			console.error('mutApi.update - Error response:', error.response?.data);
			
			// Show more specific error message
			const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to update mutation';
			toast.error(errorMessage);
			throw new Error(errorMessage);
		}
	},

	delete: async (id: string): Promise<void> => {
		return api.delete<void>(`/v1/configurations/${id}`);
	},

	clone: async (id: string): Promise<Configuration> => {
		return api.post<Configuration>(`/v1/configurations/${id}/clone`);
	},
};
