import { type LogEntry, LoggerService } from '@mutate/core';
import { Effect, Layer, Ref } from 'effect';

const createLoggerService = Effect.gen(function* () {
	const logRef = yield* Ref.make<ReadonlyArray<LogEntry>>([]);

	const addLog = (entry: LogEntry) =>
		Ref.update(logRef, (logs) => [...logs, entry]);

	return LoggerService.of({
		debug: (message: string, context?: Record<string, any>) =>
			Effect.gen(function* () {
				const entry: LogEntry = {
					level: 'debug',
					message,
					timestamp: new Date(),
					context,
				};
				yield* addLog(entry);
				console.debug(message, context);
			}),

		info: (message: string, context?: Record<string, any>) =>
			Effect.gen(function* () {
				const entry: LogEntry = {
					level: 'info',
					message,
					timestamp: new Date(),
					context,
				};
				yield* addLog(entry);
				console.info(message, context);
			}),

		warn: (message: string, context?: Record<string, any>) =>
			Effect.gen(function* () {
				const entry: LogEntry = {
					level: 'warn',
					message,
					timestamp: new Date(),
					context,
				};
				yield* addLog(entry);
				console.warn(message, context);
			}),

		error: (message: string, error?: unknown, context?: Record<string, any>) =>
			Effect.gen(function* () {
				const entry: LogEntry = {
					level: 'error',
					message,
					timestamp: new Date(),
					context: { ...context, error },
				};
				yield* addLog(entry);
				console.error(message, error, context);
			}),

		getLog: () => Ref.get(logRef),
	});
});

export const LoggerServiceLayer = Layer.effect(
	LoggerService,
	createLoggerService,
);
