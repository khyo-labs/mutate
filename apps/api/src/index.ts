import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import authPlugin from './plugins/auth.js';
import requireVerifiedEmail from './plugins/require-verified-email.js';
import { v1Routes } from './routes/v1/index.js';
import { transformationQueue } from './services/queue.js';
import './types/fastify.js';
import './workers/mutation-worker-effect.js';
import './workers/webhook-delivery-worker.js';

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
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
});

await fastify.register(multipart, {
	limits: {
		fieldNameSize: 100,
		fieldSize: 100,
		fields: 10,
		fileSize: 52_428_800, // 50MB
		files: 2,
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
await fastify.register(requireVerifiedEmail);

fastify.setErrorHandler(errorHandler);

await fastify.register(v1Routes);

async function start() {
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
}

async function gracefulShutdown(signal: string) {
	fastify.log.info(`Received ${signal}, shutting down gracefully`);
	try {
		await transformationQueue.close();
		await fastify.close();
		process.exit(0);
	} catch (err) {
		fastify.log.error({ err }, 'Error during shutdown');
		process.exit(1);
	}
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
