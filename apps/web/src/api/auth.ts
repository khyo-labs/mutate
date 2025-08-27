import type { LoginFormData, RegisterFormData, User } from '../types';
import { apiRequest } from './client';

interface AuthResponse {
	user: User;
	accessToken: string;
	refreshToken: string;
}

export const authApi = {
	register: async (data: RegisterFormData): Promise<AuthResponse> => {
		return apiRequest<AuthResponse>('POST', '/v1/auth/register', data);
	},

	login: async (data: LoginFormData): Promise<AuthResponse> => {
		return apiRequest<AuthResponse>('POST', '/v1/auth/login', data);
	},

	refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
		return apiRequest<{ accessToken: string }>('POST', '/v1/auth/refresh', {
			refreshToken,
		});
	},

	me: async (): Promise<User> => {
		return apiRequest<User>('GET', '/v1/auth/me');
	},

	logout: async (): Promise<{ message: string }> => {
		return apiRequest<{ message: string }>('POST', '/v1/auth/logout');
	},
};
