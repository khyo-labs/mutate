import { and, desc, eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '../../db/connection.js';
import { webhookDeliveries } from '../../db/schema.js';
import { webhookDeliveryQueue } from '../../services/queue.js';

export async function adminWebhookRoutes(fastify: FastifyInstance) {
	// List deliveries with optional filters
	fastify.get('/deliveries', async (request) => {
		const q = request.query as {
			status?: string;
			organizationId?: string;
			configurationId?: string;
			limit?: string | number;
			offset?: string | number;
		};

		const where = [] as any[];
		if (q.status) where.push(eq(webhookDeliveries.status, q.status));
		if (q.organizationId)
			where.push(eq(webhookDeliveries.organizationId, q.organizationId));
		if (q.configurationId)
			where.push(eq(webhookDeliveries.configurationId, q.configurationId));

		const limit = Math.min(100, Number(q.limit ?? 20));
		const offset = Number(q.offset ?? 0);

		const rows = await db
			.select()
			.from(webhookDeliveries)
			.where(where.length ? and(...where) : undefined)
			.orderBy(desc(webhookDeliveries.createdAt))
			.limit(limit)
			.offset(offset);

		return { success: true, data: rows };
	});

	// List dead-letter deliveries
	fastify.get('/dead', async () => {
		const rows = await db
			.select()
			.from(webhookDeliveries)
			.where(eq(webhookDeliveries.status, 'dead'))
			.orderBy(desc(webhookDeliveries.updatedAt))
			.limit(100);
		return { success: true, data: rows };
	});

	// Retry a delivery (re-enqueue)
	fastify.post('/retry', async (request, reply) => {
		const body = (request.body || {}) as { deliveryId?: string };
		const deliveryId = body.deliveryId;
		if (!deliveryId) {
			return reply.code(400).send({
				success: false,
				error: { code: 'BAD_REQUEST', message: 'deliveryId is required' },
			});
		}

		const delivery = await db.query.webhookDeliveries.findFirst({
			where: eq(webhookDeliveries.id, deliveryId),
		});
		if (!delivery) {
			return reply.code(404).send({
				success: false,
				error: { code: 'NOT_FOUND', message: 'Delivery not found' },
			});
		}

		await db
			.update(webhookDeliveries)
			.set({ status: 'pending', nextAttempt: new Date(), error: null })
			.where(eq(webhookDeliveries.id, deliveryId));

		await webhookDeliveryQueue.add(
			'deliver-webhook',
			{ deliveryId },
			{ jobId: deliveryId },
		);

		return { success: true };
	});
}
