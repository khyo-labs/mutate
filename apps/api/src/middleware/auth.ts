import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import { db } from '../db/connection.js';
import { apiKeys, users } from '../db/schema.js';
import '../types/fastify.js';
import type { JWTPayload } from '../types/index.js';

export async function authenticateJWT(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const token = await request.jwtVerify<JWTPayload>();

		// Verify user still exists and is active
		const user = await db
			.select()
			.from(users)
			.where(eq(users.id, token.userId))
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

		request.currentUser = {
			id: token.userId,
			organizationId: token.organizationId,
			role: user[0].role,
		};
	} catch (err) {
		return reply.code(401).send({
			success: false,
			error: {
				code: 'INVALID_TOKEN',
				message: 'Invalid or expired token',
			},
		});
	}
}

export async function authenticateAPIKey(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const apiKey = request.headers['x-api-key'] as string;

	if (!apiKey) {
		return reply.code(401).send({
			success: false,
			error: {
				code: 'API_KEY_REQUIRED',
				message: 'API key is required',
			},
		});
	}

	try {
		// Find API key by comparing hashes
		const keys = await db
			.select({
				id: apiKeys.id,
				organizationId: apiKeys.organizationId,
				keyHash: apiKeys.keyHash,
				permissions: apiKeys.permissions,
				expiresAt: apiKeys.expiresAt,
			})
			.from(apiKeys);

		let validKey = null;
		for (const key of keys) {
			const isValid = await bcrypt.compare(apiKey, key.keyHash);
			if (isValid) {
				validKey = key;
				break;
			}
		}

		if (!validKey) {
			return reply.code(401).send({
				success: false,
				error: {
					code: 'INVALID_API_KEY',
					message: 'Invalid API key',
				},
			});
		}

		// Check if key is expired
		if (validKey.expiresAt && new Date() > validKey.expiresAt) {
			return reply.code(401).send({
				success: false,
				error: {
					code: 'API_KEY_EXPIRED',
					message: 'API key has expired',
				},
			});
		}

		// Update last used timestamp
		await db
			.update(apiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKeys.id, validKey.id));

		request.currentUser = {
			id: 'api-key',
			organizationId: validKey.organizationId,
			role: 'api',
		};
	} catch (err) {
		return reply.code(500).send({
			success: false,
			error: {
				code: 'AUTH_ERROR',
				message: 'Authentication failed',
			},
		});
	}
}

export function requireRole(requiredRole: string) {
	return async function (request: FastifyRequest, reply: FastifyReply) {
		if (!request.currentUser) {
			return reply.code(401).send({
				success: false,
				error: {
					code: 'NOT_AUTHENTICATED',
					message: 'Authentication required',
				},
			});
		}

		const roleHierarchy: Record<string, number> = {
			viewer: 1,
			member: 2,
			admin: 3,
			api: 2,
		};

		const userRoleLevel = roleHierarchy[request.currentUser.role] || 0;
		const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

		if (userRoleLevel < requiredRoleLevel) {
			return reply.code(403).send({
				success: false,
				error: {
					code: 'INSUFFICIENT_PERMISSIONS',
					message: `Role '${requiredRole}' required`,
				},
			});
		}
	};
}
