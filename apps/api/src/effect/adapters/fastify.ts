import { Effect } from 'effect';
import type {
	FastifyReply,
	FastifyRequest,
	RouteGenericInterface,
} from 'fastify';

import { runtime } from '@/effect/runtime.js';

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

			const originalError = unwrapEffectError(error);

			if (options?.onError) {
				const response = options.onError(originalError as E);
				return res.status(response.status).send(response.body);
			}

			// Default error response
			return res.status(500).send({
				success: false,
				error: serializeError(originalError),
			});
		}
	};
}

function unwrapEffectError(error: unknown): unknown {
	if (!error) return error;

	if (isFiberFailure(error)) {
		const extracted = extractCauseValue(error.cause);
		if (extracted !== undefined) {
			return extracted;
		}
	}

	if (error instanceof Error) {
		const message = error.message;
		if (message) {
			try {
				return JSON.parse(message);
			} catch {
				return { code: 'ERROR', message };
			}
		}
		return { code: 'ERROR', message: error.toString() };
	}

	if (typeof error === 'object') {
		const value = extractCauseValue((error as any).cause);
		if (value !== undefined) {
			return value;
		}
	}

	if (typeof error === 'string') {
		try {
			return JSON.parse(error);
		} catch {
			return { code: 'ERROR', message: error };
		}
	}

	return error;
}

function isFiberFailure(
	error: unknown,
): error is { _tag: string; cause: unknown } {
	return (
		typeof error === 'object' &&
		error !== null &&
		'_tag' in (error as any) &&
		(error as any)._tag === 'FiberFailure'
	);
}

function extractCauseValue(cause: any): unknown {
	if (!cause || typeof cause !== 'object') {
		return undefined;
	}

	if ('value' in cause) {
		return cause.value;
	}

	const nestedKeys = ['cause', 'left', 'right', 'first', 'second'];
	for (const key of nestedKeys) {
		if (key in cause) {
			const nested = extractCauseValue(cause[key]);
			if (nested !== undefined) {
				return nested;
			}
		}
	}

	if (Array.isArray(cause.causes)) {
		for (const nested of cause.causes) {
			const value = extractCauseValue(nested);
			if (value !== undefined) {
				return value;
			}
		}
	}

	return undefined;
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
