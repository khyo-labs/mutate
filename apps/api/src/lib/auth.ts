import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '../db/connection.js';
import { organizationSubscriptions } from '../db/schema.js';

async function setupDefaultResources(organizationId: string) {
	try {
		const existingSubscription = await db
			.select()
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		if (existingSubscription.length > 0) {
			console.log(
				'Subscription already exists for organization:',
				organizationId,
			);
			return;
		}

		// Assign free plan to the new organization
		const now = new Date();
		const periodEnd = new Date(now);
		periodEnd.setMonth(periodEnd.getMonth() + 1);

		await db.insert(organizationSubscriptions).values({
			id: nanoid(),
			organizationId,
			planId: 'plan_free', // Default free plan
			status: 'active',
			currentPeriodStart: now,
			currentPeriodEnd: periodEnd,
			createdAt: now,
		});

		console.log(`✅ Assigned free tier to organization: ${organizationId}`);
	} catch (error) {
		console.error('Failed to setup default resources for organization:', error);
	}
}

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
			organizationCreation: {
				disabled: false,
				afterCreate: async ({ organization, member, user }) => {
					console.log('Organization created:', organization);
					await setupDefaultResources(organization.id);
				},
			},
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
	trustedOrigins: process.env.CORS_ORIGINS
		? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
		: ['http://localhost:5173', 'http://localhost:3000'],
	debug: process.env.NODE_ENV === 'development', // Enable debug logging in development
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
