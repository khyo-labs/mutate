import { create } from 'zustand';

import { signIn, signOut, signUp, useSession } from '../lib/auth-client';
import type { LoginFormData, RegisterFormData } from '../types';

interface AuthStore {
	isLoading: boolean;
	setLoading: (loading: boolean) => void;
	login: (credentials: LoginFormData) => Promise<void>;
	register: (data: RegisterFormData) => Promise<void>;
	logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
	isLoading: false,

	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},

	login: async (credentials: LoginFormData) => {
		set({ isLoading: true });
		try {
			await signIn.email({
				email: credentials.email,
				password: credentials.password,
				callbackURL: '/',
			});
		} finally {
			set({ isLoading: false });
		}
	},

	register: async (data: RegisterFormData) => {
		set({ isLoading: true });
		try {
			await signUp.email({
				email: data.email,
				password: data.password,
				name: data.name,
				callbackURL: '/',
			});
		} finally {
			set({ isLoading: false });
		}
	},

	logout: async () => {
		set({ isLoading: true });
		try {
			await signOut({
				fetchOptions: {
					onSuccess: () => {
						window.location.href = '/login';
					},
				},
			});
		} catch (error) {
			console.error('Failed to logout:', error);
		} finally {
			set({ isLoading: false });
		}
	},
}));

// Export the Better Auth session hook for components to use
export { useSession };
