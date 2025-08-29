import cors from '@fastify/cors';
import { createHmac } from 'crypto';
import dotenv from 'dotenv';
import Fastify from 'fastify';

dotenv.config();

const PORT = process.env.PORT || 8085;
const HOST = process.env.HOST || 'localhost';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
	throw new Error('WEBHOOK_SECRET is not set');
}

// Create Fastify instance
const fastify = Fastify({
	logger: {
		level: 'info',
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname',
			},
		},
	},
});

// Register CORS plugin
await fastify.register(cors, {
	origin: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Store webhook history in memory (for testing only)
const webhookHistory = [];

// Utility function to verify webhook signature
function verifySignature(payload, signature, secret) {
	if (!signature) return false;

	const expectedSignature = createHmac('sha256', secret)
		.update(payload)
		.digest('hex');

	const providedSignature = signature.replace('sha256=', '');

	if (providedSignature.length !== expectedSignature.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < expectedSignature.length; i++) {
		result |= expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
	}

	return result === 0;
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
	return {
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	};
});

// Main webhook endpoint
fastify.post('/webhook', async (request, reply) => {
	const startTime = Date.now();
	const headers = request.headers;
	const body = request.body;
	const signature = headers['x-mutate-signature'];
	const event = headers['x-webhook-event'];

	fastify.log.info(
		{
			event: 'webhook_received',
			headers: {
				'content-type': headers['content-type'],
				'user-agent': headers['user-agent'],
				'x-webhook-event': event,
				'x-webhook-signature': signature ? 'present' : 'missing',
			},
			bodySize: JSON.stringify(body).length,
		},
		'Webhook received',
	);

	let signatureValid = true;

	if (signature) {
		const rawBody = JSON.stringify(body);
		signatureValid = verifySignature(rawBody, signature, WEBHOOK_SECRET);

		if (!signatureValid) {
			fastify.log.warn(
				{
					event: 'signature_verification_failed',
					signature: signature,
				},
				'Webhook signature verification failed',
			);

			return reply.code(401).send({
				error: 'Invalid webhook signature',
			});
		}
	}

	// Process the webhook payload
	try {
		const webhookData = {
			id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date().toISOString(),
			event: event || 'unknown',
			signature: signature ? 'verified' : 'none',
			payload: body,
			processingTime: Date.now() - startTime,
		};

		// Store in history (limit to last 100)
		webhookHistory.push(webhookData);
		if (webhookHistory.length > 100) {
			webhookHistory.shift();
		}

		// Log detailed webhook info
		if (body && body.jobId) {
			fastify.log.info(
				{
					event: 'transformation_webhook',
					jobId: body.jobId,
					status: body.status,
					uid: body.uid,
					configurationId: body.configurationId,
					organizationId: body.organizationId,
					hasDownloadUrl: !!body.downloadUrl,
					originalFileName: body.originalFileName,
					fileSize: body.fileSize,
					executionLogLength: body.executionLog ? body.executionLog.length : 0,
					error: body.error,
				},
				`Transformation job ${body.status}: ${body.jobId}${body.uid ? ` (uid: ${body.uid})` : ''}`,
			);
		} else {
			fastify.log.info(
				{
					event: 'generic_webhook',
					payload: body,
				},
				'Generic webhook received',
			);
		}

		// Return success response
		return reply.code(200).send({
			received: true,
			id: webhookData.id,
			timestamp: webhookData.timestamp,
			processingTime: webhookData.processingTime,
		});
	} catch (error) {
		fastify.log.error(
			{
				error: error.message,
				event: 'webhook_processing_error',
			},
			'Error processing webhook',
		);

		return reply.code(500).send({
			error: 'Internal server error',
		});
	}
});

// Endpoint to view webhook history
fastify.get('/webhooks', async (request, reply) => {
	const { limit = 10, offset = 0 } = request.query;

	const paginatedHistory = webhookHistory
		.slice()
		.reverse() // Most recent first
		.slice(offset, offset + limit);

	return {
		total: webhookHistory.length,
		limit: parseInt(limit),
		offset: parseInt(offset),
		webhooks: paginatedHistory,
	};
});

// Endpoint to get specific webhook by ID
fastify.get('/webhooks/:id', async (request, reply) => {
	const { id } = request.params;
	const webhook = webhookHistory.find((w) => w.id === id);

	if (!webhook) {
		return reply.code(404).send({
			error: 'Webhook not found',
		});
	}

	return webhook;
});

// Clear webhook history
fastify.delete('/webhooks', async (request, reply) => {
	const count = webhookHistory.length;
	webhookHistory.length = 0;

	fastify.log.info(
		{
			event: 'history_cleared',
			count: count,
		},
		`Cleared ${count} webhooks from history`,
	);

	return {
		cleared: count,
		timestamp: new Date().toISOString(),
	};
});

// Endpoint to simulate webhook failures (for testing retry logic)
fastify.post('/webhook/fail', async (request, reply) => {
	const { statusCode = 500, delay = 0 } = request.body || {};

	if (delay > 0) {
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	fastify.log.warn(
		{
			event: 'simulated_failure',
			statusCode: statusCode,
			delay: delay,
		},
		'Simulating webhook failure',
	);

	return reply.code(statusCode).send({
		error: 'Simulated webhook failure',
		statusCode: statusCode,
		timestamp: new Date().toISOString(),
	});
});

// Start server
async function start() {
	try {
		await fastify.listen({
			port: PORT,
			host: HOST,
		});

		console.log('🚀 Webhook test server started!');
		console.log(`📡 Listening on: http://${HOST}:${PORT}`);
		console.log(`🎯 Webhook endpoint: http://${HOST}:${PORT}/webhook`);
		console.log(`📊 History endpoint: http://${HOST}:${PORT}/webhooks`);
		console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET}`);
		console.log('');
		console.log('Ready to receive webhooks! 🎉');
	} catch (error) {
		fastify.log.error(error);
		process.exit(1);
	}
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
	console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
	await fastify.close();
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('\n🛑 Received SIGINT, shutting down gracefully...');
	await fastify.close();
	process.exit(0);
});

start();
