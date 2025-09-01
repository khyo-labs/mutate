import { toast } from 'sonner';

import type { ApiResponse } from '../types';
import { api } from './client';

export type ApiKey = {
	id: string;
	name: string;
	permissions: string[];
	lastUsedAt: string | null;
	createdAt: string;
	expiresAt: string | null;
	apiKey?: string; // Only returned when creating
};

export const apiKeysApi = {
	list: async (): Promise<ApiKey[]> => {
		const response = await api.get<ApiResponse<ApiKey[]>>('/v1/api-keys');

		if (response.success) {
			return response.data;
		}

		toast.error('Failed to load API keys');
		throw new Error('Failed to load API keys');
	},

	create: async (data: Partial<ApiKey>): Promise<ApiKey> => {
		const response = await api.post<ApiResponse<ApiKey>>('/v1/api-keys', data);

		if (response.success) {
			toast.success('API key created successfully');
			return response.data;
		}

		toast.error('Failed to create API key');
		return {} as ApiKey;
	},

	update: async (id: string, data: Partial<ApiKey>): Promise<ApiKey> => {
		const response = await api.put<ApiResponse<ApiKey>>(
			`/v1/api-keys/${id}`,
			data,
		);

		if (response.success) {
			toast.success('API key updated successfully');
			return response.data;
		}

		toast.error('Failed to update API key');
		return {} as ApiKey;
	},

	delete: async (id: string): Promise<void> => {
		await api.delete<void>(`/v1/api-keys/${id}`);
		toast.success('API key deleted successfully');
	},
};
