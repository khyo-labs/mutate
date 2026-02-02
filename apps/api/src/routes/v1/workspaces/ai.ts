import type { FastifyInstance } from 'fastify';

import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import { AiError, generateRules } from '@/services/ai.js';
import { computeDiff } from '@/services/csv-differ.js';
import { parseCsvBuffer, parseXlsxBuffer } from '@/services/csv-parser.js';
import { isFlagEnabled } from '@/services/feature-flags.js';
import '@/types/fastify.js';
import { getErrorMessage } from '@/utils/error.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function aiRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);

	fastify.post(
		'/generate-rules',
		{ preHandler: [validateWorkspaceAccess] },
		async (request, reply) => {
			try {
				const { workspaceId } = request.params as { workspaceId: string };
				const aiEnabled = await isFlagEnabled('ai_rule_generation', workspaceId);
				if (!aiEnabled) {
					return reply.status(403).send({
						success: false,
						error: {
							code: 'FEATURE_NOT_ENABLED',
							message: 'AI rule generation is not enabled for this workspace',
						},
					});
				}

				const parts = request.parts();

				let inputBuffer: Buffer | null = null;
				let outputBuffer: Buffer | null = null;
				let hint: string | undefined;

				for await (const part of parts) {
					if (part.type === 'file') {
						const chunks: Buffer[] = [];
						for await (const chunk of part.file) {
							chunks.push(chunk as Buffer);
						}
						const buffer = Buffer.concat(chunks);

						if (buffer.length > MAX_FILE_SIZE) {
							return reply.status(413).send({
								success: false,
								error: {
									code: 'FILE_TOO_LARGE',
									message: `File "${part.fieldname}" exceeds the 5MB limit`,
								},
							});
						}

						if (part.fieldname === 'inputXlsx') {
							inputBuffer = buffer;
						} else if (part.fieldname === 'outputCsv') {
							outputBuffer = buffer;
						}
					} else if (part.type === 'field' && part.fieldname === 'hint') {
						hint = String(part.value).slice(0, 500);
					}
				}

				if (!inputBuffer || !outputBuffer) {
					return reply.status(400).send({
						success: false,
						error: {
							code: 'MISSING_FILES',
							message: 'Both inputXlsx and outputCsv files are required',
						},
					});
				}

				let inputCsv;
				let outputCsv;
				try {
					inputCsv = parseXlsxBuffer(inputBuffer);
				} catch {
					return reply.status(400).send({
						success: false,
						error: {
							code: 'INVALID_XLSX',
							message: 'Failed to parse input XLSX file',
						},
					});
				}

				try {
					outputCsv = parseCsvBuffer(outputBuffer);
				} catch {
					return reply.status(400).send({
						success: false,
						error: {
							code: 'INVALID_CSV',
							message: 'Failed to parse output CSV file',
						},
					});
				}

				const diff = computeDiff(inputCsv, outputCsv);
				const rules = await generateRules({ inputCsv, outputCsv, diff, hint });

				return reply.send({
					success: true,
					data: { rules },
				});
			} catch (error) {
				fastify.log.error(error);

				if (error instanceof AiError) {
					const statusCode = error.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
					return reply.status(statusCode).send({
						success: false,
						error: {
							code: error.code,
							message: error.message,
						},
					});
				}

				return reply.status(502).send({
					success: false,
					error: {
						code: 'AI_GENERATION_FAILED',
						message: getErrorMessage(error, 'Failed to generate transformation rules'),
					},
				});
			}
		},
	);
}
