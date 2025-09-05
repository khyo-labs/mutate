/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import { db } from '../db/connection.js';
import {
	apiKeys,
	member,
	organization,
	platformAdmins,
	user,
} from '../db/schema.js';
import { auth } from '../lib/auth.js';
import { adminAuditService } from '../services/admin/audit-service.js';
import { adminService } from '../services/admin/index.js';
import '../types/fastify.js';

export async function authenticateSession(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const fullUrl = `${request.protocol}://${request.headers.host}${request.url}`;

		const req = new Request(fullUrl, {
			method: request.method,
			headers: request.headers as any,
			body: request.body ? JSON.stringify(request.body) : undefined,
		});

		let session = await auth.api.getSession(req);

		if (!session) {
			const altSession = await auth.api.getSession({
				headers: req.headers,
			});

			if (!altSession) {
				return reply.code(401).send({
					success: false,
					error: {
						code: 'UNAUTHORIZED',
						message: 'Authentication required',
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

		const admin = await db
			.select({
				role: platformAdmins.role,
				permissions: platformAdmins.permissions,
			})
			.from(platformAdmins)
			.where(eq(platformAdmins.userId, session.user.id))
			.limit(1)
			.then((rows) => rows[0]);

		request.currentUser = {
			id: session.user.id,
			organizationId: userOrgInfo?.organizationId || '',
			role: userOrgInfo?.role || 'member',
			isAdmin: !!admin,
			adminPermissions: admin?.permissions || undefined,
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

export async function authenticate(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const authHeader = request.headers.authorization;

	if (authHeader && authHeader.startsWith('Bearer ')) {
		return authenticateAPIKey(request, reply);
	}
	return authenticateSession(request, reply);
}

export async function authenticateAPIKey(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const authHeader = request.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return reply.code(401).send({
			success: false,
			error: {
				code: 'API_KEY_REQUIRED',
				message: 'API key is required',
			},
		});
	}

	const apiKey = authHeader.substring(7);

	try {
		const keys = await db
			.select({
				id: apiKeys.id,
				organizationId: apiKeys.organizationId,
				keyHash: apiKeys.keyHash,
				permissions: apiKeys.permissions,
				expiresAt: apiKeys.expiresAt,
				createdBy: apiKeys.createdBy,
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
			id: validKey.createdBy,
			organizationId: validKey.organizationId,
			role: 'api',
			isAdmin: false,
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

export async function requireAdmin(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.currentUser) {
		return reply.code(401).send({
			success: false,
			error: {
				code: 'NOT_AUTHENTICATED',
				message: 'Authentication required',
			},
		});
	}

	if (!request.currentUser.isAdmin) {
		return reply.code(403).send({
			success: false,
			error: {
				code: 'PLATFORM_ADMIN_REQUIRED',
				message: 'Platform admin access required',
			},
		});
	}

	const clientIP =
		request.ip || (request.headers['x-forwarded-for'] as string) || '';
	const userAgent = request.headers['user-agent'] || '';

	await adminAuditService.logAdminAction(
		request.currentUser.id,
		'ADMIN_ACCESS',
		{
			resourceType: 'API_ENDPOINT',
			resourceId: request.url,
			ipAddress: clientIP,
			userAgent: userAgent,
		},
	);
}
