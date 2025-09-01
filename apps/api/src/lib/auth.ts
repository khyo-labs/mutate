import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware, organization } from 'better-auth/plugins';

import { config } from '../config.js';
import { db } from '../db/connection.js';
import { subscriptionService } from '../services/billing/subscription-service.js';
import { EmailArgs, sendEmail } from '../services/email/index.js';

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
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }: EmailArgs) => {
			await sendEmail({
				to: user.email,
				subject: 'Reset your password',
				html: `Click <a href="${url}">here</a> to reset your password.`,
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		expiresIn: 3600,
		sendVerificationEmail: async ({ user, url }: EmailArgs) => {
			console.log('Sending verification email to', user.email, url);
			await sendEmail({
				to: user.email,
				subject: 'Verify your email address',
				html: `Click <a href="${url}">here</a> to verify your email.`,
			});
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
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			if (ctx.path.startsWith('/sign-up')) {
				const newSession = ctx.context.newSession;
				if (newSession) {
					await sendEmail({
						to: 'alan@khyo.com',
						subject: 'New user registered for Mutate',
						html: `A new user, ${newSession.user.name}, registered for Mutate: ${JSON.stringify(newSession.user)}`,
					});
				}
			}
		}),
	},
	plugins: [
		organization({
			allowUserToCreateOrganization: true,
			organizationLimit: 1,
			organizationCreation: {
				disabled: false,
				afterCreate: async ({ organization, member, user }) => {
					console.log('Organization created:', organization);
					await subscriptionService.assignFreePlan(organization.id);
				},
			},
		}),
	],
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
	advanced: {
		cookiePrefix: 'mutate',
	},
	trustedOrigins: config.CORS_ORIGINS,
	logger: {
		disabled: config.NODE_ENV === 'production',
		level: 'error',
		log: (level, message, ...args) => {
			console.log(`[${level}] ${message}`, ...args);
		},
	},
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
