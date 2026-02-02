import { FastifyInstance } from 'fastify';

import {
	addWorkspaceOverride,
	createFlag,
	deleteFlag,
	getAllFlags,
	removeWorkspaceOverride,
	toggleFlag,
	updateFlag,
} from '@/services/feature-flags.js';
import { getErrorMessage } from '@/utils/error.js';
import { logError } from '@/utils/logger.js';

export async function adminFeatureRoutes(fastify: FastifyInstance) {
	fastify.get('/', async (request, reply) => {
		try {
			const flags = await getAllFlags();
			return reply.send(flags);
		} catch (error) {
			logError(request.log, 'List feature flags error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'LIST_FLAGS_FAILED',
					message: getErrorMessage(error, 'Failed to list feature flags'),
				},
			});
		}
	});

	fastify.post('/', async (request, reply) => {
		try {
			const { name, description, enabled, rolloutPercentage } = request.body as {
				name: string;
				description?: string;
				enabled?: boolean;
				rolloutPercentage?: number;
			};

			if (!name || name.trim().length === 0) {
				return reply.status(400).send({
					success: false,
					error: {
						code: 'FLAG_NAME_REQUIRED',
						message: 'Feature flag name is required',
					},
				});
			}

			const flag = await createFlag({ name: name.trim(), description, enabled, rolloutPercentage });
			return reply.status(201).send({ success: true, data: flag });
		} catch (error) {
			logError(request.log, 'Create feature flag error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'CREATE_FLAG_FAILED',
					message: getErrorMessage(error, 'Failed to create feature flag'),
				},
			});
		}
	});

	fastify.put('/:id', async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { name, description, enabled, rolloutPercentage } = request.body as {
				name?: string;
				description?: string;
				enabled?: boolean;
				rolloutPercentage?: number;
			};

			const flag = await updateFlag(id, { name, description, enabled, rolloutPercentage });
			return reply.send({ success: true, data: flag });
		} catch (error) {
			logError(request.log, 'Update feature flag error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'UPDATE_FLAG_FAILED',
					message: getErrorMessage(error, 'Failed to update feature flag'),
				},
			});
		}
	});

	fastify.patch('/:id', async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { enabled } = request.body as { enabled: boolean };

			await toggleFlag(id, enabled);
			return reply.send({ success: true, data: { id, enabled } });
		} catch (error) {
			logError(request.log, 'Toggle feature flag error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'TOGGLE_FLAG_FAILED',
					message: getErrorMessage(error, 'Failed to toggle feature flag'),
				},
			});
		}
	});

	fastify.delete('/:id', async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			await deleteFlag(id);
			return reply.send({ success: true, data: { id } });
		} catch (error) {
			logError(request.log, 'Delete feature flag error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'DELETE_FLAG_FAILED',
					message: getErrorMessage(error, 'Failed to delete feature flag'),
				},
			});
		}
	});

	fastify.post('/:id/override', async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { workspaceId, enabled } = request.body as {
				workspaceId: string;
				enabled: boolean;
			};

			if (!workspaceId) {
				return reply.status(400).send({
					success: false,
					error: {
						code: 'WORKSPACE_ID_REQUIRED',
						message: 'Workspace ID is required',
					},
				});
			}

			await addWorkspaceOverride(id, workspaceId, enabled);
			return reply.send({ success: true, data: { id, workspaceId, enabled } });
		} catch (error) {
			logError(request.log, 'Add workspace override error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'ADD_OVERRIDE_FAILED',
					message: getErrorMessage(error, 'Failed to add workspace override'),
				},
			});
		}
	});

	fastify.delete('/:id/override/:workspaceId', async (request, reply) => {
		try {
			const { id, workspaceId } = request.params as { id: string; workspaceId: string };
			await removeWorkspaceOverride(id, workspaceId);
			return reply.send({ success: true, data: { id, workspaceId } });
		} catch (error) {
			logError(request.log, 'Remove workspace override error:', error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'REMOVE_OVERRIDE_FAILED',
					message: getErrorMessage(error, 'Failed to remove workspace override'),
				},
			});
		}
	});
}
