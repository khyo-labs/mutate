import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware, organization } from 'better-auth/plugins';
import { passkey } from 'better-auth/plugins/passkey';
import { twoFactor } from 'better-auth/plugins/two-factor';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from 'drizzle-orm';

import { config } from '@/config.js';
import { db } from '@/db/connection.js';
import { user } from '@/db/schema.js';
import { subscriptionService } from '@/services/billing/subscription-service.js';
import { EmailArgs, sendEmail } from '@/services/email/index.js';

export const auth = betterAuth({
	appName: 'Mutate',
	secret:
		process.env.BETTER_AUTH_SECRET ||
		'fallback-secret-for-development-only-minimum-32-chars',
	database: drizzleAdapter(db, {
		provider: 'pg',
	}),
	baseURL: `${process.env.API_BASE_URL || 'http://localhost:3000'}/v1/auth`,
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
		passkey({
			rpName: 'Mutate',
			rpID:
				config.NODE_ENV === 'production'
					? new URL(config.CORS_ORIGINS[0]).hostname
					: 'localhost',
			origin: process.env.BASE_URL || 'http://localhost:5173',
		}),
		twoFactor({
			issuer: 'Mutate',
		}),
		organization({
			allowUserToCreateOrganization: true,
			organizationLimit: 10,
			organizationCreation: {
				disabled: false,
				afterCreate: async ({ organization, member, user }) => {
					console.log('Organization created:', organization);
					await subscriptionService.assignDefaultPlan(organization.id);
				},
			},
			async sendInvitationEmail(data) {
				const inviteLink = `${config.BASE_URL}/join?invitation=${data.id}`;
				await sendEmail({
					to: data.email,
					subject: `You're invited to join ${data.organization.name}`,
					html: `<p>You have been invited to join the ${data.organization.name} workspace by ${data.inviter.user.name}. Click <a href="${inviteLink}">here</a> to accept.</p><p>Link: ${inviteLink}</p>`,
				});
			},
		}),
	],
	databaseHooks: {
		session: {
			create: {
				before: async (session: any) => {
					if (!session.userId) {
						return { data: session };
					}
					const [userData] = await db
						.select()
						.from(user)
						.where(eq(user.id, session.userId));

					if (!userData) {
						return { data: session };
					}

					return {
						data: {
							...session,
							activeOrganizationId:
								userData.activeOrganizationId || session.activeOrganizationId,
						},
					};
				},
			},
			update: {
				after: async (session: any) => {
					if (session.activeOrganizationId !== undefined && session.userId) {
						await db
							.update(user)
							.set({
								activeOrganizationId: session.activeOrganizationId,
								updatedAt: new Date(),
							})
							.where(eq(user.id, session.userId));
					}
				},
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		additionalFields: {
			activeOrganizationId: {
				type: 'string',
				required: false,
			},
		},
	},
	user: {
		additionalFields: {
			twoFactorEnabled: {
				type: 'boolean',
				required: false,
				defaultValue: false,
				input: false,
			},
		},
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
