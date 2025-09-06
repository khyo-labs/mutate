import type { LoginFormData, RegisterFormData, User } from '../types';
import { api } from './client';

export interface AuthResponse {
	user: User;
	accessToken: string;
	refreshToken: string;
}

export const authApi = {
	register: async (data: RegisterFormData): Promise<AuthResponse> => {
		const response = await api.post<{ user: User; session: { token: string } }>(
			'/v1/auth/sign-up/email',
			{
				email: data.email,
				password: data.password,
				name: data.name,
			},
		);
		return {
			user: response.user,
			accessToken: response.session?.token || '',
			refreshToken: response.session?.token || '',
		};
	},

	login: async (data: LoginFormData): Promise<AuthResponse> => {
		const response = await api.post<{ user: User; session: { token: string } }>(
			'/v1/auth/sign-in/email',
			{
				email: data.email,
				password: data.password,
			},
		);
		return {
			user: response.user,
			accessToken: response.session?.token || '',
			refreshToken: response.session?.token || '',
		};
	},

	refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
		return api.post<{ accessToken: string }>('/v1/auth/refresh', {
			refreshToken,
		});
	},

	me: async (): Promise<User> => {
		const response = await api.get<{ success: boolean; data: User }>(
			'/v1/user/me',
		);
		return response.data;
	},

	logout: async (): Promise<{ message: string }> => {
		await api.post('/v1/auth/sign-out');
		return { message: 'Logged out successfully' };
	},
};
