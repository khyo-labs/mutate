import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthState, AuthTokens, User } from '../types';

interface AuthStore extends AuthState {
	login: (user: User, tokens: AuthTokens) => void;
	logout: () => void;
	setLoading: (loading: boolean) => void;
	updateTokens: (tokens: AuthTokens) => void;
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set, get) => ({
			user: null,
			accessToken: null,
			refreshToken: null,
			isAuthenticated: false,
			isLoading: false,

			login: (user: User, tokens: AuthTokens) => {
				set({
					user,
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					isAuthenticated: true,
					isLoading: false,
				});
			},

			logout: () => {
				set({
					user: null,
					accessToken: null,
					refreshToken: null,
					isAuthenticated: false,
					isLoading: false,
				});
			},

			setLoading: (isLoading: boolean) => {
				set({ isLoading });
			},

			updateTokens: (tokens: AuthTokens) => {
				set({
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
				});
			},
		}),
		{
			name: 'convert-auth',
			partialize: (state) => ({
				user: state.user,
				accessToken: state.accessToken,
				refreshToken: state.refreshToken,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);
