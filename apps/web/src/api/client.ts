import axios, {
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'sonner';

import type {} from '../types';

type RequestOptions = {
	endpoint: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	data?: Record<string, unknown>;
};

class ApiClient {
	private readonly axios: AxiosInstance;

	constructor() {
		this.axios = axios.create({
			baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
			timeout: 10_000,
			withCredentials: true,
		});

		this.setupInterceptors();
	}

	private setupInterceptors() {
		this.axios.interceptors.request.use(
			(config: InternalAxiosRequestConfig) => config,
			(error) => {
				console.log("Error's request interceptor", error);
				return Promise.reject(error);
			},
		);

		this.axios.interceptors.response.use(
			(response: AxiosResponse) => response,
			(error) => {
				console.error('Response error:', error.response?.data || error);
				const errorMessage = error.response?.data?.error?.message || 'An unexpected error occurred';
				toast.error(errorMessage);
				return Promise.reject(error);
			},
		);
	}

	private async makeRequest<T>({ endpoint, method, data }: RequestOptions): Promise<T> {
		const config: AxiosRequestConfig = {
			url: endpoint,
			method,
			data,
		};
		const response: AxiosResponse<T> = await this.axios(config);
		return response.data;
	}

	get<T>(endpoint: string): Promise<T> {
		return this.makeRequest({ endpoint, method: 'GET' });
	}

	post<T>(endpoint: string, data: Record<string, unknown> = {}): Promise<T> {
		return this.makeRequest({ endpoint, method: 'POST', data });
	}

	put<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
		return this.makeRequest({ endpoint, method: 'PUT', data });
	}

	patch<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
		return this.makeRequest({ endpoint, method: 'PATCH', data });
	}

	delete<T>(endpoint: string): Promise<T> {
		return this.makeRequest({ endpoint, method: 'DELETE' });
	}

	async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
		const response: AxiosResponse<T> = await this.axios.post(endpoint, formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
			timeout: 60_000,
		});
		return response.data;
	}
}

export const api = new ApiClient();
