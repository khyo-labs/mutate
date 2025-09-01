import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import authPlugin from './plugins/auth.js';
import { betterAuthRoutes } from './routes/better-auth.js';
import { billingRoutes } from './routes/billing.js';
import { configRoutes } from './routes/configuration.js';
import { fileRoutes } from './routes/files.js';
import { healthRoutes } from './routes/health.js';
import { mutateRoutes } from './routes/mutate.js';
import { workspaceRoutes } from './routes/workspace.js';
import { transformationQueue } from './services/queue.js';
import './types/fastify.js';
import './workers/mutation-worker.js';

const fastify = Fastify({
	logger: {
		level: config.LOG_LEVEL,
		...(config.NODE_ENV === 'development' && {
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: true,
					ignore: 'pid,hostname',
				},
			},
		}),
	},
	bodyLimit: 52_428_800, // 50MB
	requestTimeout: 30_000, // 30 seconds
});

await fastify.register(helmet, {
	contentSecurityPolicy: false,
});

await fastify.register(cors, {
	origin: config.CORS_ORIGINS,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'X-Requested-With',
		'Accept',
		'Origin',
	],
});

await fastify.register(multipart, {
	limits: {
		fieldNameSize: 100,
		fieldSize: 100,
		fields: 10,
		fileSize: 52_428_800, // 50MB
		files: 1,
		headerPairs: 2_000,
	},
});

await fastify.register(rateLimit, {
	max: 1_000,
	timeWindow: '1 minute',
	keyGenerator: (request) => {
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}
		return request.ip;
	},
});

await fastify.register(authPlugin);

fastify.setErrorHandler(errorHandler);

await fastify.register(healthRoutes, { prefix: '/v1/health' });
await fastify.register(betterAuthRoutes, { prefix: '/v1/auth' });
await fastify.register(configRoutes, {
	prefix: '/v1/configurations',
});
await fastify.register(workspaceRoutes, { prefix: '/v1/workspaces' });
await fastify.register(mutateRoutes, { prefix: '/v1/mutate' });
await fastify.register(fileRoutes, { prefix: '/v1/files' });
await fastify.register(billingRoutes, { prefix: '/v1/billing' });

const { apiKeyRoutes } = await import('./routes/api-keys.js');
await fastify.register(apiKeyRoutes, { prefix: '/v1/api-keys' });

const start = async () => {
	try {
		const address = await fastify.listen({
			port: config.PORT,
			host: config.HOST,
		});
		fastify.log.info(`Server listening on ${address}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

const gracefulShutdown = async (signal: string) => {
	fastify.log.info(`Received ${signal}, shutting down gracefully`);
	try {
		await transformationQueue.close();
		await fastify.close();
		process.exit(0);
	} catch (err) {
		fastify.log.error({ err }, 'Error during shutdown');
		process.exit(1);
	}
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
