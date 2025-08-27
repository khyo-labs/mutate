import axios from 'axios';

import type { ApiResponse } from '../types';

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
	timeout: 10_000,
	withCredentials: true,
});

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
