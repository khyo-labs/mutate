import type { Job, ProcessCallbackFunction } from 'bull';
import { Effect } from 'effect';

import { runtime } from '@/effect/runtime.js';

/**
 * Adapter to use Effect pipelines as Bull job processors
 * The runtime provides DatabaseService, LoggerService, and StorageService
 */
export function effectBullProcessor<T, A, E = never>(
	effectFn: (data: T, job: Job<T>) => Effect.Effect<A, E, any>,
): ProcessCallbackFunction<T> {
	return async (job: Job<T>) => {
		try {
			console.log(`Processing job ${job.id} with Effect processor`);

			// The runtime provides all required services
			const result = await runtime.runPromise(effectFn(job.data, job) as any);

			console.log(`Job ${job.id} completed successfully`);
			return result;
		} catch (error) {
			console.error(`Job ${job.id} failed:`, error);

			// Re-throw to let Bull handle retry logic
			throw error;
		}
	};
}

/**
 * Helper to track job progress within an Effect
 */
export function reportProgress(job: Job, progress: number) {
	return Effect.tryPromise({
		try: () => job.progress(progress),
		catch: (error) => new Error(`Failed to report progress: ${error}`),
	});
}
