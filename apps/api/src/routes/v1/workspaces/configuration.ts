import { type Configuration, DatabaseService } from '@mutate/core';
import { eq, ilike } from 'drizzle-orm';
import { Effect } from 'effect';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ulid } from 'ulid';

import { configurations } from '@/db/schema.js';
import { effectHandler } from '@/effect/adapters/fastify.js';
import { requireRole } from '@/middleware/auth.js';
import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import { configurationQuerySchema, createSchema, updateSchema } from '@/schemas/configuration.js';
import '@/types/fastify.js';

interface CreateConfigurationBody {
	name: string;
	description?: string;
	conversionType: 'XLSX_TO_CSV' | 'DOCX_TO_PDF';
	inputFormat: any;
	rules: any;
	outputFormat: any;
	callbackUrl?: string;
}

interface UpdateConfigurationBody {
	name?: string;
	description?: string;
	rules?: any;
	outputFormat?: any;
	callbackUrl?: string;
}

interface ConfigurationParams {
	configurationId: string;
}

interface QueryParams {
	search?: string;
	page?: number;
	limit?: number;
}

/**
 * Effect-based configuration routes demonstrating migration from traditional async/await
 */
export async function configurationRoutes(fastify: FastifyInstance) {
	// Apply authentication and workspace validation to all routes
	fastify.addHook('preHandler', async (request, reply) => {
		await fastify.authenticate(request, reply);
		await validateWorkspaceAccess(request, reply);
	});

	// Create configuration
	fastify.post<{ Body: CreateConfigurationBody }>(
		'/',
		{
			preHandler: [requireRole('owner')],
			schema: {
				body: {
					type: 'object',
					required: ['name', 'conversionType', 'inputFormat', 'rules', 'outputFormat'],
					properties: {
						name: { type: 'string' },
						description: { type: 'string' },
						conversionType: {
							type: 'string',
							enum: [
								'XLSX_TO_CSV',
								'DOCX_TO_PDF',
								'HTML_TO_PDF',
								'PDF_TO_CSV',
								'JSON_TO_CSV',
								'CSV_TO_JSON',
							],
						},
						inputFormat: {
							type: 'string',
							enum: ['XLSX', 'DOCX', 'HTML', 'PDF', 'JSON', 'CSV'],
						},
						rules: { type: 'array' },
						outputFormat: { type: 'object' },
						callbackUrl: { type: 'string' },
						webhookUrlId: { type: 'string' },
					},
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Body: CreateConfigurationBody }>) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;

					// Validate request
					const validationResult = createSchema.safeParse(req.body);
					if (!validationResult.success) {
						return yield* Effect.fail({
							code: 'VALIDATION_ERROR',
							message: 'Invalid request data',
							details: validationResult.error.issues.reduce(
								(acc: Record<string, string>, err: any) => {
									const field = err.path.join('.');
									acc[field] = err.message;
									return acc;
								},
								{} as Record<string, string>,
							),
						});
					}

					const {
						name,
						description,
						conversionType,
						inputFormat,
						rules,
						outputFormat,
						callbackUrl,
					} = validationResult.data;

					// Workspace is always available from middleware
					const organizationId = req.workspace!.id;
					const userId = req.currentUser!.id;
					const configurationId = ulid();

					// Create configuration
					const configuration = yield* database.createConfiguration({
						id: configurationId,
						organizationId,
						name,
						description,
						conversionType,
						inputFormat,
						rules,
						outputFormat,
						callbackUrl,
						version: 1,
						createdBy: userId,
					});

					// Create initial version
					yield* database.createConfigurationVersion({
						id: ulid(),
						configurationId,
						version: 1,
						rules,
						outputFormat,
						createdBy: userId,
					});

					return {
						id: configuration.id,
						name: configuration.name,
						description: configuration.description,
						conversionType: configuration.conversionType,
						inputFormat: configuration.inputFormat,
						rules: configuration.rules,
						outputFormat: configuration.outputFormat,
						version: configuration.version,
						createdAt: configuration.createdAt,
					};
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
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

	// Get all configurations with pagination and search
	fastify.get<{ Querystring: QueryParams }>(
		'/',
		{
			schema: {
				querystring: {
					type: 'object',
					properties: {
						search: { type: 'string' },
						page: { type: 'number', default: 1, minimum: 1 },
						limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
					},
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Querystring: QueryParams }>) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;

					const validationResult = configurationQuerySchema.safeParse(req.query);
					if (!validationResult.success) {
						return yield* Effect.fail({
							code: 'VALIDATION_ERROR',
							message: 'Invalid query parameters',
						});
					}

					const { search, page, limit } = validationResult.data;
					const organizationId = req.workspace!.id;
					const offset = (page - 1) * limit;

					// Build query conditions
					const conditions = [eq(configurations.organizationId, organizationId)];
					if (search) {
						conditions.push(ilike(configurations.name, `%${search}%`));
					}

					// Get configurations with pagination
					const configs = yield* database.getConfigurations(organizationId, {
						search,
						offset,
						limit,
					});

					// Get total count
					const totalCount = yield* database.getConfigurationCount(organizationId, search);

					return {
						success: true,
						data: configs,
						pagination: {
							page,
							limit,
							total: totalCount,
							totalPages: Math.ceil(totalCount / limit),
						},
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

	// Get single configuration
	fastify.get<{ Params: ConfigurationParams }>(
		'/:configurationId',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						configurationId: { type: 'string' },
					},
					required: ['configurationId'],
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Params: ConfigurationParams }>) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;
					const { configurationId } = req.params;
					const organizationId = req.workspace!.id;

					const configuration = yield* database.getConfiguration(configurationId).pipe(
						Effect.filterOrFail(
							(config): config is Configuration => config.organizationId === organizationId,
							() => ({
								code: 'NOT_FOUND',
								message: 'Configuration not found',
							}),
						),
					);

					return configuration;
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: 404,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);

	// Update configuration
	fastify.put<{
		Params: ConfigurationParams;
		Body: UpdateConfigurationBody;
	}>(
		'/:configurationId',
		{
			preHandler: [requireRole('owner')],
			schema: {
				params: {
					type: 'object',
					properties: {
						configurationId: { type: 'string' },
					},
					required: ['configurationId'],
				},
				body: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						description: { type: 'string' },
						rules: { type: 'array' },
						outputFormat: { type: 'object' },
						callbackUrl: { type: 'string' },
					},
				},
			},
		},
		effectHandler(
			(
				req: FastifyRequest<{
					Params: ConfigurationParams;
					Body: UpdateConfigurationBody;
				}>,
			) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;
					const { configurationId } = req.params;
					const organizationId = req.workspace!.id;
					const userId = req.currentUser!.id;

					// Validate update data
					const validationResult = updateSchema.safeParse(req.body);
					if (!validationResult.success) {
						return yield* Effect.fail({
							code: 'VALIDATION_ERROR',
							message: 'Invalid request data',
						});
					}

					// Check configuration exists and belongs to organization
					const existing = yield* database.getConfiguration(configurationId).pipe(
						Effect.filterOrFail(
							(config): config is Configuration => config.organizationId === organizationId,
							() => ({
								code: 'NOT_FOUND',
								message: 'Configuration not found',
							}),
						),
					);

					// Update configuration (filter out null values)
					const updateData: any = {};
					for (const [key, value] of Object.entries(validationResult.data)) {
						if (value !== null && value !== undefined) {
							updateData[key] = value;
						}
					}

					const updatedConfig = yield* database.updateConfiguration(configurationId, updateData);

					// Create new version if rules or output format changed
					if (validationResult.data.rules || validationResult.data.outputFormat) {
						const newVersion = (existing.version || 1) + 1;

						yield* database.createConfigurationVersion({
							id: ulid(),
							configurationId,
							version: newVersion,
							rules: validationResult.data.rules || existing.rules,
							outputFormat: validationResult.data.outputFormat || existing.outputFormat,
							createdBy: userId,
						});

						// Update version number in configuration
						yield* database.updateConfiguration(configurationId, {
							version: newVersion,
						});
					}

					return updatedConfig;
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
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

	// Delete configuration
	fastify.delete<{ Params: ConfigurationParams }>(
		'/:configurationId',
		{
			preHandler: [requireRole('owner')],
			schema: {
				params: {
					type: 'object',
					properties: {
						configurationId: { type: 'string' },
					},
					required: ['configurationId'],
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Params: ConfigurationParams }>) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;
					const { configurationId } = req.params;
					const organizationId = req.workspace!.id;

					// Check configuration exists and belongs to organization
					yield* database.getConfiguration(configurationId).pipe(
						Effect.filterOrFail(
							(config): config is Configuration => config.organizationId === organizationId,
							() => ({
								code: 'NOT_FOUND',
								message: 'Configuration not found',
							}),
						),
					);

					// Delete configuration (versions will cascade)
					yield* database.deleteConfiguration(configurationId);

					return { message: 'Configuration deleted successfully' };
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: 404,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);
}
