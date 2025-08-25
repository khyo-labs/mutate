import axios from 'axios';

import { useAuthStore } from '../stores/auth-store';
import type { ApiResponse } from '../types';

// Create axios instance
export const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
	timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
	(config) => {
		const { accessToken } = useAuthStore.getState();
		if (accessToken) {
			config.headers.Authorization = `Bearer ${accessToken}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
	(response) => {
		return response;
	},
	async (error) => {
		const original = error.config;

		if (error.response?.status === 401 && !original._retry) {
			original._retry = true;

			const { refreshToken, updateTokens, logout } = useAuthStore.getState();

			if (refreshToken) {
				try {
					const response = await axios.post(
						`${api.defaults.baseURL}/auth/refresh`,
						{
							refreshToken,
						},
					);

					if (response.data.success) {
						const { accessToken: newAccessToken } = response.data.data;
						updateTokens({
							accessToken: newAccessToken,
							refreshToken, // Keep the same refresh token
						});

						// Retry the original request
						original.headers.Authorization = `Bearer ${newAccessToken}`;
						return api(original);
					}
				} catch (refreshError) {
					// Refresh failed, logout user
					logout();
					window.location.href = '/login';
					return Promise.reject(refreshError);
				}
			} else {
				// No refresh token, logout user
				logout();
				window.location.href = '/login';
			}
		}

		return Promise.reject(error);
	},
);

// Generic API request wrapper
export async function apiRequest<T>(
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	url: string,
	data?: any,
	config?: any,
): Promise<T> {
	try {
		const response = await api.request({
			method,
			url,
			data,
			...config,
		});

		const result: ApiResponse<T> = response.data;

		if (result.success) {
			return result.data;
		} else {
			throw new Error(result.error.message);
		}
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const apiError = error.response?.data as ApiResponse;
			if (apiError && !apiError.success) {
				throw new Error(apiError.error.message);
			}
			throw new Error(error.message);
		}
		throw error;
	}
}
