import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import { db } from '../db/connection.js';
import { apiKeys, member, organization } from '../db/schema.js';
import { auth } from '../lib/auth.js';
import '../types/fastify.js';

export async function authenticateSession(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		// Create a proper Request object that Better Auth can use
		const fullUrl = `${request.protocol}://${request.headers.host}${request.url}`;

		// Convert Fastify request to a proper Request object
		const req = new Request(fullUrl, {
			method: request.method,
			headers: request.headers as any,
			body: request.body ? JSON.stringify(request.body) : undefined,
		});

		let session = await auth.api.getSession(req);

		if (!session) {
			console.log('Trying alternative session method...');
			const altSession = await auth.api.getSession({
				headers: req.headers,
			});
			console.log('alt session:', altSession);

			if (!altSession) {
				return reply.code(401).send({
					success: false,
					error: {
						code: 'NOT_AUTHENTICATED',
						message: 'No valid session found',
					},
				});
			} else {
				session = altSession;
			}
		}

		const membership = await db
			.select({
				organizationId: member.organizationId,
				role: member.role,
				organization: organization,
			})
			.from(member)
			.leftJoin(organization, eq(member.organizationId, organization.id))
			.where(eq(member.userId, session.user.id))
			.limit(1);

		const userOrgInfo = membership[0];

		request.currentUser = {
			id: session.user.id,
			organizationId: userOrgInfo?.organizationId || '',
			role: userOrgInfo?.role || 'member',
		};
	} catch (err) {
		return reply.code(401).send({
			success: false,
			error: {
				code: 'INVALID_SESSION',
				message: 'Invalid or expired session',
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
