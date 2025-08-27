import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type CreateOrganizationRequest, orgApi } from '../api/organizations';

export function useCreateOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateOrganizationRequest) => orgApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organizations'],
			});
		},
	});
}

export function useCheckSlugExists() {
	return useMutation({
		mutationFn: (slug: string) => orgApi.isSlugAvailable(slug),
	});
}
