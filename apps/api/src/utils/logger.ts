import { FastifyBaseLogger } from 'fastify';
import pino from 'pino';

import { config } from '@/config.js';

// Helper function to safely log errors
export function logError(logger: FastifyBaseLogger, message: string, error: unknown) {
	if (error instanceof Error) {
		logger.error({ err: error }, message);
	} else if (typeof error === 'string') {
		logger.error({ error }, message);
	} else {
		logger.error({ error: String(error) }, message);
	}
}

export const logger = pino({
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
	...(config.NODE_ENV === 'production' && {
		formatters: {
			level: (label) => {
				return { level: label };
			},
			log: (object) => {
				return {
					...object,
					timestamp: new Date().toISOString(),
				};
			},
		},
	}),
});
