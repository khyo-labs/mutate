import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
	baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/v1/auth`,
	plugins: [],
});
