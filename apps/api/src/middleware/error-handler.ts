/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export async function errorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	request.log.error(error);

	// Zod validation errors
	if (error instanceof ZodError) {
		return reply.code(400).send({
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid request data',
				details: (error as any).errors.reduce(
					(acc: Record<string, string>, err: any) => {
						const field = err.path.join('.');
						acc[field] = err.message;
						return acc;
					},
					{} as Record<string, string>,
				),
			},
		});
	}

	// Fastify validation errors
	if (error.validation) {
		return reply.code(400).send({
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid request data',
				details: error.validation,
			},
		});
	}

	// File size limit exceeded
	if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
		return reply.code(413).send({
			success: false,
			error: {
				code: 'FILE_TOO_LARGE',
				message: 'File size exceeds maximum allowed limit',
			},
		});
	}

	// Rate limit exceeded
	if (error.code === 'FST_TOO_MANY_REQUESTS') {
		return reply.code(429).send({
			success: false,
			error: {
				code: 'RATE_LIMIT_EXCEEDED',
				message: 'Too many requests, please try again later',
			},
		});
	}

	// Database constraint violations
	if (error.code === '23505') {
		// unique_violation
		return reply.code(409).send({
			success: false,
			error: {
				code: 'DUPLICATE_RESOURCE',
				message: 'Resource already exists',
			},
		});
	}

	if (error.code === '23503') {
		// foreign_key_violation
		return reply.code(400).send({
			success: false,
			error: {
				code: 'INVALID_REFERENCE',
				message: 'Referenced resource does not exist',
			},
		});
	}

	// Default server error
	const statusCode = error.statusCode || 500;

	return reply.code(statusCode).send({
		success: false,
		error: {
			code: error.code || 'INTERNAL_SERVER_ERROR',
			message: statusCode >= 500 ? 'Internal server error' : error.message,
		},
	});
}
