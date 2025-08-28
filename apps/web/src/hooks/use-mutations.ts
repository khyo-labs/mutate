import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

import { mutApi } from '@/api/mutations';

import type { Configuration, PaginatedResponse } from '../types';

export function useMutations(
	params?: { page?: number; limit?: number; search?: string },
	options?: UseQueryOptions<PaginatedResponse<Configuration>>,
) {
	return useQuery({
		queryKey: ['mutations'],
		queryFn: () => mutApi.list(params),
		...options,
	});
}
