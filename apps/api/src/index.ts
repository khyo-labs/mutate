import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import authPlugin from './plugins/auth.js';
import { betterAuthRoutes } from './routes/better-auth.js';
import { configurationRoutes } from './routes/configuration/index.js';
import { healthRoutes } from './routes/health.js';
import { transformRoutes } from './routes/transform.js';
import './types/fastify.js';

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

// Register plugins
await fastify.register(helmet, {
	contentSecurityPolicy: false,
});

await fastify.register(cors, {
	origin: config.CORS_ORIGINS,
	credentials: true,
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
		return (request.headers['x-api-key'] as string) || request.ip;
	},
});

// Register auth plugin
await fastify.register(authPlugin);

// Register error handler
fastify.setErrorHandler(errorHandler);

// Register routes
await fastify.register(healthRoutes, { prefix: '/v1/health' });
await fastify.register(betterAuthRoutes, { prefix: '/v1/auth' });
await fastify.register(configurationRoutes, {
	prefix: '/v1/configurations',
});
await fastify.register(transformRoutes, { prefix: '/v1/transform' });

// Start server
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

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
	fastify.log.info(`Received ${signal}, shutting down gracefully`);
	try {
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
