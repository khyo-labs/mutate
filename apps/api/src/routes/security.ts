/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { auth } from '../lib/auth.js';

const enableTwoFactorSchema = z.object({
	password: z.string(),
});

const verifyTotpSchema = z.object({
	code: z.string().length(6),
});

const disableTwoFactorSchema = z.object({
	password: z.string(),
});

const passwordOnlySchema = z.object({
	password: z.string(),
});

export async function securityRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);

	fastify.post('/two-factor/enable', async (request, reply) => {
		const { password } = enableTwoFactorSchema.parse(request.body);

		try {
			const response = await auth.api.enableTwoFactor({
				body: {
					password,
				},
				headers: request.headers as any,
			});

			if (!response) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'ENABLE_2FA_FAILED',
						message: 'Failed to enable two-factor authentication',
					},
				});
			}

			return reply.send({
				success: true,
				data: response,
			});
		} catch (error: any) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'ENABLE_2FA_FAILED',
					message:
						error.message || 'Failed to enable two-factor authentication',
				},
			});
		}
	});

	fastify.post('/two-factor/verify', async (request, reply) => {
		const { code } = request.body as z.infer<typeof verifyTotpSchema>;

		try {
			const response = await auth.api.verifyTOTP({
				body: {
					code,
					trustDevice: true,
				},
				headers: request.headers as any,
			});

			if (!response) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'INVALID_VERIFICATION_CODE',
						message: 'Invalid verification code',
					},
				});
			}

			return reply.send({
				success: true,
				data: response,
			});
		} catch (error: any) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'VERIFICATION_FAILED',
					message: error.message || 'Failed to verify code',
				},
			});
		}
	});

	fastify.post('/two-factor/disable', async (request, reply) => {
		const { password } = disableTwoFactorSchema.parse(request.body);

		try {
			const response = await auth.api.disableTwoFactor({
				body: {
					password,
				},
				headers: request.headers as any,
			});

			if (!response) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'DISABLE_2FA_FAILED',
						message: 'Failed to disable two-factor authentication',
					},
				});
			}

			return reply.send({
				success: true,
				data: response,
			});
		} catch (error: any) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'DISABLE_2FA_FAILED',
					message:
						error.message || 'Failed to disable two-factor authentication',
				},
			});
		}
	});

	fastify.post('/two-factor/view-backup-codes', async (request, reply) => {
		const userId = request.currentUser?.id;

		if (!userId) {
			return reply.code(401).send({
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Authentication required',
				},
			});
		}

		try {
			const response = await auth.api.viewBackupCodes({
				body: {
					userId,
				},
			});

			if (!response) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'BACKUP_CODES_RETRIEVAL_FAILED',
						message: 'Failed to retrieve backup codes',
					},
				});
			}

			return reply.send({
				success: true,
				data: response,
			});
		} catch (error: any) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'BACKUP_CODES_RETRIEVAL_FAILED',
					message: error.message || 'Failed to retrieve backup codes',
				},
			});
		}
	});

	fastify.post('/two-factor/generate-backup-codes', async (request, reply) => {
		const { password } = passwordOnlySchema.parse(request.body);

		try {
			const response = await auth.api.generateBackupCodes({
				body: {
					password,
				},
				headers: request.headers as any,
			});

			if (!response) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'BACKUP_CODES_GENERATION_FAILED',
						message: 'Failed to generate backup codes',
					},
				});
			}

			return reply.send({
				success: true,
				data: response,
			});
		} catch (error: any) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'BACKUP_CODES_GENERATION_FAILED',
					message: error.message || 'Failed to generate backup codes',
				},
			});
		}
	});
}
