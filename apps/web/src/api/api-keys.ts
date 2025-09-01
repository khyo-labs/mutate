import { toast } from 'sonner';

import type { SuccessResponse } from '@/types';

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

export type ApiKeyCreate = {
	name: string;
	permissions: string[];
	expiresAt: string | null;
};

export const apiKeysApi = {
	list: async (): Promise<ApiKey[]> => {
		const response = await api.get<SuccessResponse<ApiKey[]>>('/v1/api-keys');
		return response.data;
	},

	create: async (data: ApiKeyCreate): Promise<ApiKey> => {
		const response = await api.post<SuccessResponse<ApiKey>>(
			'/v1/api-keys',
			data,
		);

		toast.success('API key created successfully');
		return response.data;
	},

	update: async (id: string, data: ApiKeyCreate): Promise<ApiKey> => {
		const response = await api.put<SuccessResponse<ApiKey>>(
			`/v1/api-keys/${id}`,
			data,
		);

		toast.success('API key updated successfully');
		return response.data;
	},

	delete: async (id: string): Promise<void> => {
		await api.delete<void>(`/v1/api-keys/${id}`);
		toast.success('API key deleted successfully');
	},
};
