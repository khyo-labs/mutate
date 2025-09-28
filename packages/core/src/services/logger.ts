import { Context, Effect } from 'effect';

export interface LogEntry {
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	timestamp: Date;
	context?: Record<string, any>;
}

export interface LoggerService {
	debug: (
		message: string,
		context?: Record<string, any>,
	) => Effect.Effect<void>;
	info: (message: string, context?: Record<string, any>) => Effect.Effect<void>;
	warn: (message: string, context?: Record<string, any>) => Effect.Effect<void>;
	error: (
		message: string,
		error?: unknown,
		context?: Record<string, any>,
	) => Effect.Effect<void>;
	getLog: () => Effect.Effect<ReadonlyArray<LogEntry>>;
}

export const LoggerService = Context.GenericTag<LoggerService>(
	'@mutate/core/LoggerService',
);
