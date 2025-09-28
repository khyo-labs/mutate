import { Effect } from 'effect';
import type {
	FastifyReply,
	FastifyRequest,
	RouteGenericInterface,
} from 'fastify';

import { runtime } from '../runtime.js';

export interface EffectHandlerOptions<A, E> {
	onSuccess?: (data: A) => { status: number; body: any };
	onError?: (error: E) => { status: number; body: any };
}

/**
 * Adapter to use Effect pipelines as Fastify route handlers
 * The runtime provides DatabaseService, LoggerService, and StorageService
 */
export function effectHandler<
	A,
	E,
	T extends RouteGenericInterface = RouteGenericInterface,
>(
	effectFn: (req: FastifyRequest<T>) => Effect.Effect<A, E, any>,
	options?: EffectHandlerOptions<A, E>,
) {
	return async (req: FastifyRequest<T>, res: FastifyReply) => {
		try {
			// The runtime provides all required services
			const result = await runtime.runPromise(effectFn(req) as any);

			if (options?.onSuccess) {
				const response = options.onSuccess(result as A);
				return res.status(response.status).send(response.body);
			}

			return res.send({ success: true, data: result });
		} catch (error) {
			console.error('Effect handler error:', error);

			if (options?.onError) {
				const response = options.onError(error as E);
				return res.status(response.status).send(response.body);
			}

			// Default error response
			const errorMessage =
				error instanceof Error ? error.message : 'Internal server error';

			return res.status(500).send({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: errorMessage,
				},
			});
		}
	};
}

/**
 * Helper to serialize Effect errors for API responses
 */
export function serializeError(error: unknown): any {
	if (error && typeof error === 'object' && '_tag' in error) {
		// Tagged Effect error
		return {
			code: (error as any)._tag,
			message: (error as any).message || (error as any)._tag,
			details: error,
		};
	}

	if (error instanceof Error) {
		return {
			code: 'ERROR',
			message: error.message,
		};
	}

	return {
		code: 'UNKNOWN_ERROR',
		message: String(error),
	};
}
