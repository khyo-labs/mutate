import { toast } from 'sonner';

import { useWorkspaceStore } from '@/stores/workspace-store';

import type {
	Configuration,
	ConfigurationFormData,
	SuccessResponse,
} from '../types';
import { api } from './client';

export const mutApi = {
	get: async (id: string): Promise<Configuration> => {
		const workspace = useWorkspaceStore.getState().activeWorkspace;
		if (!workspace) {
			throw new Error('No active workspace selected');
		}

		const url = `/v1/workspace/${workspace.id}/configuration/${id}`;

		const response = await api.get<SuccessResponse<Configuration>>(url);

		if (response.success) {
			return response.data;
		}

		toast.error('Failed to get mutation');
		throw new Error('Failed to get mutation');
	},

	create: async (data: ConfigurationFormData): Promise<Configuration> => {
		const workspace = useWorkspaceStore.getState().activeWorkspace;
		if (!workspace) {
			throw new Error('No active workspace selected');
		}

		const url = `/v1/workspace/${workspace.id}/configuration`;

		return api.post<Configuration>(url, data);
	},

	update: async (
		id: string,
		data: Partial<ConfigurationFormData>,
	): Promise<Configuration> => {
		const workspace = useWorkspaceStore.getState().activeWorkspace;
		if (!workspace) {
			throw new Error('No active workspace selected');
		}

		const url = `/v1/workspace/${workspace.id}/configuration/${id}`;

		const response = await api.put<SuccessResponse<Configuration>>(url, data);

		return response.data;
	},

	delete: async (id: string): Promise<void> => {
		const workspace = useWorkspaceStore.getState().activeWorkspace;
		if (!workspace) {
			throw new Error('No active workspace selected');
		}

		const url = `/v1/workspace/${workspace.id}/configuration/${id}`;

		return api.delete<void>(url);
	},

	clone: async (id: string): Promise<Configuration> => {
		const workspace = useWorkspaceStore.getState().activeWorkspace;
		if (!workspace) {
			throw new Error('No active workspace selected');
		}

		const url = `/v1/workspace/${workspace.id}/configuration/${id}/clone`;

		const response = await api.post<SuccessResponse<Configuration>>(url);
		return response.data;
	},
};
