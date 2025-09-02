import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type AuthResponse, authApi } from '../api/authentication';
import type { LoginFormData, RegisterFormData } from '../types';

export const authKeys = {
	all: ['auth'] as const,
	user: () => [...authKeys.all, 'user'] as const,
};

export function useCurrentUser() {
	return useQuery({
		queryKey: authKeys.user(),
		queryFn: () => authApi.me(),
		retry: false,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: LoginFormData) => authApi.login(data),
		onSuccess: (response: AuthResponse) => {
			queryClient.setQueryData(authKeys.user(), response.user);
		},
	});
}

export function useRegister() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: RegisterFormData) => authApi.register(data),
		onSuccess: (response: AuthResponse) => {
			queryClient.setQueryData(authKeys.user(), response.user);
		},
	});
}

export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authApi.logout(),
		onSuccess: () => {
			queryClient.clear();
		},
	});
}

export function useRefreshToken() {
	return useMutation({
		mutationFn: (refreshToken: string) => authApi.refresh(refreshToken),
	});
}
