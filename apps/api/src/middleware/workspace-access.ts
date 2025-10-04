import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import { db } from '@/db/connection.js';
import { member, organization } from '@/db/schema.js';
import '@/types/fastify.js';
import { logError } from '@/utils/logger.js';

export async function validateWorkspaceAccess(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { workspaceId } = request.params as { workspaceId: string };

		if (!workspaceId) {
			return reply.status(400).send({
				success: false,
				error: {
					code: 'WORKSPACE_ID_REQUIRED',
					message: 'Workspace ID is required',
				},
			});
		}

		if (!request.currentUser) {
			return reply.status(401).send({
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Authentication required',
				},
			});
		}

		// Check if workspace exists
		const [workspace] = await db
			.select()
			.from(organization)
			.where(eq(organization.id, workspaceId))
			.limit(1);

		if (!workspace) {
			return reply.status(404).send({
				success: false,
				error: {
					code: 'WORKSPACE_NOT_FOUND',
					message: 'Workspace not found',
				},
			});
		}

		// Check if user is a member of the workspace
		const [membership] = await db
			.select()
			.from(member)
			.where(
				and(
					eq(member.organizationId, workspaceId),
					eq(member.userId, request.currentUser.id),
				),
			)
			.limit(1);

		if (!membership) {
			return reply.status(403).send({
				success: false,
				error: {
					code: 'WORKSPACE_ACCESS_DENIED',
					message: 'You do not have access to this workspace',
				},
			});
		}

		// Attach workspace info to request for use in routes
		request.workspace = {
			id: workspace.id,
			name: workspace.name,
			slug: workspace.slug,
			memberRole: membership.role,
		};
	} catch (error) {
		logError(request.log, 'Workspace access validation error:', error);
		return reply.status(500).send({
			success: false,
			error: {
				code: 'WORKSPACE_ACCESS_CHECK_FAILED',
				message: 'Failed to validate workspace access',
			},
		});
	}
}
