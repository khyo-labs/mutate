import { DatabaseService } from '@mutate/core';
import { Effect } from 'effect';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { findConverter } from '@/converters/index.js';
import { effectHandler, serializeError } from '@/effect/adapters/fastify.js';
import { getOutputFileExtension, getOutputMimeType, validateMimeType } from '@/utils/mime-type.js';

interface ConvertParams {
	inputType: string;
	outputType: string;
}

interface ConvertQuery {
	configId?: string;
	dryRun?: string;
}

export async function convertRoutes(app: FastifyInstance) {
	app.addHook('preHandler', app.authenticate);

	app.post<{
		Params: ConvertParams;
		Querystring: ConvertQuery;
	}>(
		'/from/:inputType/to/:outputType',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						inputType: { type: 'string' },
						outputType: { type: 'string' },
					},
					required: ['inputType', 'outputType'],
				},
				querystring: {
					type: 'object',
					properties: {
						configId: { type: 'string' },
						dryRun: { type: 'string' },
					},
				},
			},
		},
		effectHandler(
			(
				req: FastifyRequest<{
					Params: ConvertParams;
					Querystring: ConvertQuery;
				}>,
			) =>
				Effect.gen(function* () {
					const { inputType, outputType } = req.params;
					const { configId, dryRun } = req.query;
					const contentType = req.headers['content-type'] || '';

					const converter = findConverter(inputType, outputType);
					if (!converter) {
						return yield* Effect.fail({
							code: 'UNSUPPORTED_CONVERSION',
							message: `Conversion from ${inputType} to ${outputType} not supported`,
						});
					}

					let fileBuffer: Buffer;
					let fileName: string;

					if (contentType.startsWith('multipart/')) {
						const data = yield* Effect.tryPromise({
							try: () => (req as any).file(),
							catch: (error) => ({
								code: 'FILE_UPLOAD_ERROR',
								message: String(error),
							}),
						});

						if (!data) {
							return yield* Effect.fail({
								code: 'MISSING_FILE',
								message: 'File is required',
							});
						}

						const multipartData = data as any;

						fileBuffer = yield* Effect.tryPromise({
							try: async () => {
								const chunks: Buffer[] = [];
								for await (const chunk of multipartData.file) chunks.push(chunk);
								return Buffer.concat(chunks);
							},
							catch: (error) => ({
								code: 'STREAM_ERROR',
								message: String(error),
							}),
						});

						fileName = multipartData.filename || `file.${inputType}`;

						const fileMimeType = multipartData.mimetype || '';
						if (
							!validateMimeType(fileMimeType, inputType) &&
							fileMimeType !== 'application/octet-stream'
						) {
							return yield* Effect.fail({
								code: 'INVALID_FILE_TYPE',
								message: `File type mismatch. Expected ${inputType}, got ${fileMimeType}`,
							});
						}
					} else {
						return yield* Effect.fail({
							code: 'INVALID_CONTENT_TYPE',
							message: 'Expected multipart/form-data',
						});
					}

					if (dryRun === 'true') {
						return {
							success: true,
							message: 'Dry run successful',
							converter: `${inputType}→${outputType}`,
							fileName,
						};
					}

					let config: any = undefined;
					if (configId) {
						const database = yield* DatabaseService;
						config = yield* database.getConfiguration(configId).pipe(
							Effect.mapError((error) => ({
								code: 'CONFIGURATION_NOT_FOUND',
								message: `Configuration ${configId} not found`,
							})),
						);
					}

					const result = yield* converter.convert(fileBuffer, config).pipe(
						Effect.mapError((error) => ({
							code: 'CONVERSION_ERROR',
							message: serializeError(error),
						})),
					);

					const isJson = typeof result === 'object' && outputType === 'json';
					if (isJson) {
						return {
							success: true,
							data: result,
							outputFormat: outputType,
						};
					}

					const outputBuffer = Buffer.isBuffer(result)
						? result
						: Buffer.from(typeof result === 'string' ? result : JSON.stringify(result));

					return {
						success: true,
						data: outputBuffer.toString('base64'),
						fileName: fileName.replace(/\.[^.]+$/, `.${getOutputFileExtension(outputType)}`),
						mimeType: getOutputMimeType(outputType),
						outputFormat: outputType,
					};
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: data,
				}),
				onError: (error) => ({
					status: 400,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);
}
