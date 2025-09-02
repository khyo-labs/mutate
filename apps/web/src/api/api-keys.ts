import { toast } from 'sonner';
import { z } from 'zod';

import type { SuccessResponse } from '@/types';

import { api } from './client';

export const schema = z.object({
	name: z.string().min(1, 'Name is required'),
	permissions: z.array(z.string()),
	expiresAt: z.string().nullable().optional(),
});

export type ApiKeyFormData = z.infer<typeof schema>;

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

	create: async (data: ApiKeyFormData): Promise<ApiKey> => {
		const response = await api.post<SuccessResponse<ApiKey>>(
			'/v1/api-keys',
			data,
		);

		toast.success('API key created successfully');
		return response.data;
	},

	update: async (id: string, data: ApiKeyFormData): Promise<ApiKey> => {
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
