import type { LoginFormData, RegisterFormData, User } from '../types';
import { api } from './client';

export interface AuthResponse {
	user: User;
	accessToken: string;
	refreshToken: string;
}

export const authApi = {
	register: async (data: RegisterFormData): Promise<AuthResponse> => {
		return api.post<AuthResponse>('/v1/auth/register', data);
	},

	login: async (data: LoginFormData): Promise<AuthResponse> => {
		return api.post<AuthResponse>('/v1/auth/login', data);
	},

	refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
		return api.post<{ accessToken: string }>('/v1/auth/refresh', {
			refreshToken,
		});
	},

	me: async (): Promise<User> => {
		return api.get<User>('/v1/auth/me');
	},

	logout: async (): Promise<{ message: string }> => {
		return api.post<{ message: string }>('/v1/auth/logout');
	},
};
