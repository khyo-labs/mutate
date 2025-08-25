import type { LoginFormData, RegisterFormData, User } from '../types';
import { apiRequest } from './client';

interface AuthResponse {
	user: User;
	accessToken: string;
	refreshToken: string;
}

export const authApi = {
	register: async (data: RegisterFormData): Promise<AuthResponse> => {
		return apiRequest<AuthResponse>('POST', '/auth/register', data);
	},

	login: async (data: LoginFormData): Promise<AuthResponse> => {
		return apiRequest<AuthResponse>('POST', '/auth/login', data);
	},

	refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
		return apiRequest<{ accessToken: string }>('POST', '/auth/refresh', {
			refreshToken,
		});
	},

	me: async (): Promise<User> => {
		return apiRequest<User>('GET', '/auth/me');
	},

	logout: async (): Promise<{ message: string }> => {
		return apiRequest<{ message: string }>('POST', '/auth/logout');
	},
};
