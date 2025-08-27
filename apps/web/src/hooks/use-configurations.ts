import {
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';

import { configApi } from '../api/configurations';
import type {
	Configuration,
	ConfigurationFormData,
	PaginatedResponse,
} from '../types';

export const configurationKeys = {
	all: ['configurations'] as const,
	lists: () => [...configurationKeys.all, 'list'] as const,
	list: (params?: Record<string, any>) =>
		[...configurationKeys.lists(), params] as const,
	details: () => [...configurationKeys.all, 'detail'] as const,
	detail: (id: string) => [...configurationKeys.details(), id] as const,
};

export function useConfigurations(
	params?: { page?: number; limit?: number; search?: string },
	options?: UseQueryOptions<PaginatedResponse<Configuration>>,
) {
	return useQuery({
		queryKey: configurationKeys.list(params),
		queryFn: () => configApi.list(params),
		...options,
	});
}

export function useConfiguration(
	id: string,
	options?: UseQueryOptions<Configuration>,
) {
	return useQuery({
		queryKey: configurationKeys.detail(id),
		queryFn: () => configApi.get(id),
		enabled: !!id,
		...options,
	});
}

export function useCreateConfiguration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: ConfigurationFormData) => configApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: configurationKeys.lists(),
			});
		},
	});
}

export function useUpdateConfiguration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Partial<ConfigurationFormData>;
		}) => configApi.update(id, data),
		onSuccess: (updatedConfig) => {
			queryClient.invalidateQueries({
				queryKey: configurationKeys.lists(),
			});
			queryClient.setQueryData(
				configurationKeys.detail(updatedConfig.id),
				updatedConfig,
			);
		},
	});
}

export function useDeleteConfiguration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => configApi.delete(id),
		onSuccess: (_, deletedId) => {
			queryClient.invalidateQueries({
				queryKey: configurationKeys.lists(),
			});
			queryClient.removeQueries({
				queryKey: configurationKeys.detail(deletedId),
			});
		},
	});
}

export function useCloneConfiguration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => configApi.clone(id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: configurationKeys.lists(),
			});
		},
	});
}
