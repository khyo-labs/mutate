import { FastifyReply, FastifyRequest } from 'fastify';

import '../types/fastify.js';

export async function validateWorkspaceAdmin(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.workspace) {
		// This should have been set by the validateWorkspaceAccess middleware
		return reply.status(500).send({
			success: false,
			error: {
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Workspace context not found.',
			},
		});
	}

	const { memberRole } = request.workspace;

	if (memberRole !== 'owner' && memberRole !== 'admin') {
		return reply.status(403).send({
			success: false,
			error: {
				code: 'FORBIDDEN',
				message: 'You do not have permission to perform this action.',
			},
		});
	}
}
