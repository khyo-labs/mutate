import pino from 'pino';

import { config } from '../config.js';

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
