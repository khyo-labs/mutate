import { create } from 'zustand';

import { mutApi } from '@/api/mutations';
import { workspaceApi } from '@/api/workspaces';

import type {
	Configuration,
	ConfigurationFormData,
	TransformationRule,
} from '../types';
import { useWorkspaceStore } from './workspace-store';

interface ConfigurationStore {
	configurations: Configuration[];
	currentConfiguration: Configuration | null;
	isLoading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	} | null;

	// Actions
	fetchConfigurations: (params?: {
		page?: number;
		limit?: number;
		search?: string;
	}) => Promise<void>;
	createConfiguration: (data: ConfigurationFormData) => Promise<Configuration>;
	updateConfiguration: (
		id: string,
		data: Partial<ConfigurationFormData>,
	) => Promise<Configuration>;
	deleteConfiguration: (id: string) => Promise<void>;
	fetchConfiguration: (id: string) => Promise<Configuration>;
	setCurrentConfiguration: (config: Configuration | null) => void;

	setConfigurations: (configs: Configuration[]) => void;
	addConfiguration: (config: Configuration) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;

	availableRules: TransformationRule[];
	setAvailableRules: (rules: TransformationRule[]) => void;
}

// Default available rule templates
const defaultRuleTemplates: TransformationRule[] = [
	{
		id: 'template-select-worksheet',
		type: 'SELECT_WORKSHEET',
		params: {
			value: 'Sheet1',
			type: 'name',
		},
	},
	{
		id: 'template-validate-columns',
		type: 'VALIDATE_COLUMNS',
		params: {
			numOfColumns: 10,
			onFailure: 'notify',
		},
	},
	{
		id: 'template-unmerge-fill',
		type: 'UNMERGE_AND_FILL',
		params: {
			columns: ['A'],
			fillDirection: 'down',
		},
	},
	{
		id: 'template-delete-rows',
		type: 'DELETE_ROWS',
		params: {
			method: 'condition',
			condition: {
				type: 'contains',
				column: 'any',
				value: 'Total',
			},
		},
	},
	{
		id: 'template-delete-columns',
		type: 'DELETE_COLUMNS',
		params: {
			columns: ['A', 'B'],
		},
	},
	{
		id: 'template-combine-worksheets',
		type: 'COMBINE_WORKSHEETS',
		params: {
			sourceSheets: ['Sheet1', 'Sheet2'],
			operation: 'append',
		},
	},
	{
		id: 'template-evaluate-formulas',
		type: 'EVALUATE_FORMULAS',
		params: {
			enabled: true,
		},
	},
	{
		id: 'template-replace-characters',
		type: 'REPLACE_CHARACTERS',
		params: {
			replacements: [
				{
					find: ',',
					replace: '|',
					scope: 'all',
				},
			],
		},
	},
];

export const useConfigurationStore = create<ConfigurationStore>((set, get) => ({
	configurations: [],
	currentConfiguration: null,
	isLoading: false,
	error: null,
	pagination: null,
	availableRules: defaultRuleTemplates,

	// API methods
	fetchConfigurations: async (params = {}) => {
		console.log('fetchConfigurations: Starting...', params);
		set({ isLoading: true, error: null });
		try {
			const workspace = useWorkspaceStore.getState().activeWorkspace;
			if (!workspace) {
				throw new Error('No active workspace selected');
			}
			const response = await workspaceApi.getMutations(workspace.id, params);

			let configurations: Configuration[], pagination;

			if (Array.isArray(response)) {
				configurations = response;
				pagination = null;
			} else if (response && response.data) {
				configurations = response.data;
				pagination = response.pagination || null;
			} else {
				configurations = [];
				pagination = null;
			}

			set({
				configurations,
				pagination,
				isLoading: false,
			});
			console.log('fetchConfigurations: State after set', get());
		} catch (error: unknown) {
			console.log('fetchConfigurations: Error', error);
			set({
				error:
					error instanceof Error
						? error.message
						: 'Failed to fetch configurations',
				isLoading: false,
			});
		}
	},

	createConfiguration: async (data: ConfigurationFormData) => {
		console.log('createConfiguration: Starting...', data);
		set({ isLoading: true, error: null });
		try {
			const newConfig = await mutApi.create(data);
			console.log('createConfiguration: Success', newConfig);
			set((state) => ({
				configurations: [newConfig, ...state.configurations],
				isLoading: false,
			}));
			return newConfig;
		} catch (error: unknown) {
			console.log('createConfiguration: Error', error);
			set({
				error:
					error instanceof Error
						? error.message
						: 'Failed to create configuration',
				isLoading: false,
			});
			throw error;
		}
	},

	updateConfiguration: async (
		id: string,
		data: Partial<ConfigurationFormData>,
	) => {
		set({ isLoading: true, error: null });
		try {
			const updatedConfig = await mutApi.update(id, data);
			set((state) => ({
				configurations: state.configurations.map((config) =>
					config.id === id ? updatedConfig : config,
				),
				currentConfiguration:
					state.currentConfiguration?.id === id
						? updatedConfig
						: state.currentConfiguration,
				isLoading: false,
			}));
			return updatedConfig;
		} catch (error: unknown) {
			set({
				error:
					error instanceof Error
						? error.message
						: 'Failed to update configuration',
				isLoading: false,
			});
			throw error;
		}
	},

	deleteConfiguration: async (id: string) => {
		set({ isLoading: true, error: null });
		try {
			await mutApi.delete(id);
			set((state) => ({
				configurations: state.configurations.filter(
					(config) => config.id !== id,
				),
				currentConfiguration:
					state.currentConfiguration?.id === id
						? null
						: state.currentConfiguration,
				isLoading: false,
			}));
		} catch (error: unknown) {
			set({
				error:
					error instanceof Error
						? error.message
						: 'Failed to delete configuration',
				isLoading: false,
			});
			throw error;
		}
	},

	fetchConfiguration: async (id: string) => {
		set({ isLoading: true, error: null });
		try {
			const config = await mutApi.get(id);
			set({ currentConfiguration: config, isLoading: false });
			return config;
		} catch (error: unknown) {
			set({
				error:
					error instanceof Error
						? error.message
						: 'Failed to fetch configuration',
				isLoading: false,
			});
			throw error;
		}
	},

	setConfigurations: (configurations) => set({ configurations }),

	addConfiguration: (config) => {
		set((state) => ({
			configurations: [config, ...state.configurations],
		}));
	},

	setCurrentConfiguration: (currentConfiguration) =>
		set({ currentConfiguration }),

	setLoading: (isLoading) => set({ isLoading }),

	setError: (error) => set({ error }),

	setAvailableRules: (availableRules) => set({ availableRules }),
}));
