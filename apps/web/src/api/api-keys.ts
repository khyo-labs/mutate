import { toast } from 'sonner';

import type { ApiResponse } from '../types';
import { api } from './client';

export interface ApiKey {
	id: string;
	name: string;
	permissions: string[];
	lastUsedAt: string | null;
	createdAt: string;
	expiresAt: string | null;
	apiKey?: string; // Only returned when creating
}

export interface CreateApiKeyRequest {
	name: string;
	permissions?: string[];
	expiresAt?: string;
}

export interface UpdateApiKeyRequest {
	name?: string;
	permissions?: string[];
	expiresAt?: string;
}

export const apiKeysApi = {
	list: async (): Promise<ApiKey[]> => {
		const response = await api.get<ApiResponse<ApiKey[]>>('/v1/api-keys');

		if (response.success) {
			return response.data;
		}

		toast.error('Failed to load API keys');
		throw new Error('Failed to load API keys');
	},

	create: async (data: CreateApiKeyRequest): Promise<ApiKey> => {
		const response = await api.post<ApiResponse<ApiKey>>('/v1/api-keys', data);

		if (response.success) {
			toast.success('API key created successfully');
			return response.data;
		}

		toast.error('Failed to create API key');
		throw new Error('Failed to create API key');
	},

	update: async (id: string, data: UpdateApiKeyRequest): Promise<ApiKey> => {
		const response = await api.put<ApiResponse<ApiKey>>(`/v1/api-keys/${id}`, data);

		if (response.success) {
			toast.success('API key updated successfully');
			return response.data;
		}

		toast.error('Failed to update API key');
		throw new Error('Failed to update API key');
	},

	delete: async (id: string): Promise<void> => {
		const response = await api.delete<void>(`/v1/api-keys/${id}`);
		toast.success('API key deleted successfully');
	},
};