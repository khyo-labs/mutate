import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '../db/connection.js';
import { organizations, users } from '../db/schema.js';
import {
	loginSchema,
	refreshTokenSchema,
	registerSchema,
} from '../schemas/auth.js';
import type {
	LoginRequest,
	RefreshTokenRequest,
	RegisterRequest,
} from '../schemas/auth.js';
import '../types/fastify.js';
import type { JWTPayload } from '../types/index.js';
import { logError } from '../utils/logger.js';

export async function authRoutes(fastify: FastifyInstance) {
	// Register new user and organization
	fastify.post('/register', async (request, reply) => {
		// Validate request body
		const validationResult = registerSchema.safeParse(request.body);
		if (!validationResult.success) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request data',
					details: validationResult.error.errors.reduce(
						(acc, err) => {
							const field = err.path.join('.');
							acc[field] = err.message;
							return acc;
						},
						{} as Record<string, string>,
					),
				},
			});
		}

		const { email, password, organizationName, role } = validationResult.data;

		try {
			// Check if user already exists
			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			if (existingUser.length > 0) {
				return reply.code(409).send({
					success: false,
					error: {
						code: 'USER_EXISTS',
						message: 'User with this email already exists',
					},
				});
			}

			// Hash password
			const passwordHash = await bcrypt.hash(password, 12);

			// Create organization and user in transaction
			const result = await db.transaction(async (tx) => {
				// Create organization
				const [organization] = await tx
					.insert(organizations)
					.values({
						name: organizationName,
						plan: 'free',
					})
					.returning();

				// Create user
				const [user] = await tx
					.insert(users)
					.values({
						email,
						passwordHash,
						organizationId: organization.id,
						role,
					})
					.returning();

				return { organization, user };
			});

			// Generate JWT tokens
			const payload: JWTPayload = {
				userId: result.user.id,
				organizationId: result.organization.id,
				role: result.user.role as any,
			};

			const accessToken = fastify.jwt.sign(payload, { expiresIn: '1h' });
			const refreshToken = fastify.jwt.sign(payload, { expiresIn: '30d' });

			return {
				success: true,
				data: {
					user: {
						id: result.user.id,
						email: result.user.email,
						role: result.user.role,
						organizationId: result.organization.id,
						organizationName: result.organization.name,
					},
					accessToken,
					refreshToken,
				},
			};
		} catch (error) {
			logError(request.log, 'Registration error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'REGISTRATION_FAILED',
					message: 'Failed to create user account',
				},
			});
		}
	});

	// Login user
	fastify.post('/login', async (request, reply) => {
		// Validate request body
		const validationResult = loginSchema.safeParse(request.body);
		if (!validationResult.success) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request data',
					details: validationResult.error.errors.reduce(
						(acc, err) => {
							const field = err.path.join('.');
							acc[field] = err.message;
							return acc;
						},
						{} as Record<string, string>,
					),
				},
			});
		}

		const { email, password } = validationResult.data;

		try {
			// Find user with organization
			const result = await db
				.select({
					user: users,
					organization: organizations,
				})
				.from(users)
				.innerJoin(organizations, eq(users.organizationId, organizations.id))
				.where(eq(users.email, email))
				.limit(1);

			if (!result.length) {
				return reply.code(401).send({
					success: false,
					error: {
						code: 'INVALID_CREDENTIALS',
						message: 'Invalid email or password',
					},
				});
			}

			const { user, organization } = result[0];

			// Verify password
			const isValidPassword = await bcrypt.compare(password, user.passwordHash);
			if (!isValidPassword) {
				return reply.code(401).send({
					success: false,
					error: {
						code: 'INVALID_CREDENTIALS',
						message: 'Invalid email or password',
					},
				});
			}

			// Generate JWT tokens
			const payload: JWTPayload = {
				userId: user.id,
				organizationId: organization.id,
				role: user.role as any,
			};

			const accessToken = fastify.jwt.sign(payload, { expiresIn: '1h' });
			const refreshToken = fastify.jwt.sign(payload, { expiresIn: '30d' });

			return {
				success: true,
				data: {
					user: {
						id: user.id,
						email: user.email,
						role: user.role,
						organizationId: organization.id,
						organizationName: organization.name,
					},
					accessToken,
					refreshToken,
				},
			};
		} catch (error) {
			logError(request.log, 'Login error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'LOGIN_FAILED',
					message: 'Login failed',
				},
			});
		}
	});

	// Refresh token
	fastify.post('/refresh', async (request, reply) => {
		// Validate request body
		const validationResult = refreshTokenSchema.safeParse(request.body);
		if (!validationResult.success) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request data',
					details: validationResult.error.errors.reduce(
						(acc, err) => {
							const field = err.path.join('.');
							acc[field] = err.message;
							return acc;
						},
						{} as Record<string, string>,
					),
				},
			});
		}

		const { refreshToken } = validationResult.data;

		try {
			const payload = fastify.jwt.verify<JWTPayload>(refreshToken);

			// Verify user still exists
			const user = await db
				.select()
				.from(users)
				.where(eq(users.id, payload.userId))
				.limit(1);

			if (!user.length) {
				return reply.code(401).send({
					success: false,
					error: {
						code: 'INVALID_TOKEN',
						message: 'User no longer exists',
					},
				});
			}

			// Generate new access token
			const newPayload: JWTPayload = {
				userId: payload.userId,
				organizationId: payload.organizationId,
				role: payload.role,
			};

			const accessToken = fastify.jwt.sign(newPayload, { expiresIn: '1h' });

			return {
				success: true,
				data: {
					accessToken,
				},
			};
		} catch (error) {
			return reply.code(401).send({
				success: false,
				error: {
					code: 'INVALID_TOKEN',
					message: 'Invalid or expired refresh token',
				},
			});
		}
	});

	// Get current user
	fastify.get(
		'/me',
		{
			preHandler: [fastify.authenticate],
		},
		async (request, reply) => {
			try {
				const result = await db
					.select({
						user: users,
						organization: organizations,
					})
					.from(users)
					.innerJoin(organizations, eq(users.organizationId, organizations.id))
					.where(eq(users.id, request.currentUser!.id))
					.limit(1);

				if (!result.length) {
					return reply.code(404).send({
						success: false,
						error: {
							code: 'USER_NOT_FOUND',
							message: 'User not found',
						},
					});
				}

				const { user, organization } = result[0];

				return {
					success: true,
					data: {
						id: user.id,
						email: user.email,
						role: user.role,
						organizationId: organization.id,
						organizationName: organization.name,
					},
				};
			} catch (error) {
				logError(request.log, 'Get user error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'USER_FETCH_FAILED',
						message: 'Failed to fetch user information',
					},
				});
			}
		},
	);

	// Logout (placeholder - tokens are stateless)
	fastify.post(
		'/logout',
		{
			preHandler: [fastify.authenticate],
		},
		async (request, reply) => {
			return {
				success: true,
				data: {
					message: 'Logged out successfully',
				},
			};
		},
	);
}
