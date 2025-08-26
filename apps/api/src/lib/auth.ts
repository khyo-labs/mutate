import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';

import { db } from '../db/connection.js';

export const auth = betterAuth({
	secret:
		process.env.BETTER_AUTH_SECRET ||
		'fallback-secret-for-development-only-minimum-32-chars',
	database: drizzleAdapter(db, {
		provider: 'pg',
	}),
	baseURL: `${process.env.BASE_URL || 'http://localhost:3000'}/v1/auth`,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		forgotPasswordEnabled: true,
		sendResetPassword: async ({ user, url }) => {
			console.log(`Password reset link for ${user.email}: ${url}`);
		},
	},
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || '',
			clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
		},
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
		},
	},
	plugins: [
		organization({
			allowUserToCreateOrganization: true,
			organizationLimit: 1,
		}),
	],
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		storage: 'cookie',
		cookie: {
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			httpOnly: true,
		},
	},
	trustedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
	debug: process.env.NODE_ENV === 'development', // Enable debug logging in development
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
