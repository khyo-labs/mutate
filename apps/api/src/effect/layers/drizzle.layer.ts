import {
	ConfigNotFound,
	type Configuration,
	type ConfigurationInput,
	type ConfigurationVersionInput,
	DatabaseService,
	DbError,
	type JobMetadata,
	type JobStatus,
} from '@mutate/core';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { Effect, Layer } from 'effect';
import { ulid } from 'ulid';

import { db } from '../../db/connection.js';
import {
	configurationVersions,
	configurations,
	transformationJobs,
} from '../../db/schema.js';

const DrizzleDatabaseService = DatabaseService.of({
	getConfiguration: (id: string) =>
		Effect.tryPromise({
			try: async () => {
				const [config] = await db
					.select()
					.from(configurations)
					.where(eq(configurations.id, id))
					.limit(1);

				if (!config) {
					throw new ConfigNotFound({ configurationId: id });
				}

				return {
					id: config.id,
					organizationId: config.organizationId,
					name: config.name,
					description: config.description || undefined,
					rules: config.rules as Configuration['rules'],
					outputFormat: config.outputFormat as Configuration['outputFormat'],
					conversionType:
						config.conversionType as Configuration['conversionType'],
					inputFormat: config.inputFormat as Configuration['inputFormat'],
					version: config.version,
					isActive: config.isActive,
					createdBy: config.createdBy,
					createdAt: config.createdAt,
					updatedAt: config.updatedAt,
				};
			},
			catch: (error) => {
				if (error instanceof ConfigNotFound) {
					return error;
				}
				return new DbError({
					op: 'getConfiguration',
					cause: error,
				});
			},
		}),

	updateJobStatus: (id: string, status: JobStatus, meta?: JobMetadata) =>
		Effect.tryPromise({
			try: async () => {
				const updateData: any = {
					status,
					updatedAt: new Date(),
				};

				if (meta) {
					if (meta.startedAt) updateData.startedAt = meta.startedAt;
					if (meta.completedAt) updateData.completedAt = meta.completedAt;
					if (meta.downloadUrl) updateData.outputFileUrl = meta.downloadUrl;
					if (meta.error) updateData.error = meta.error;
					if (meta.inputFileUrl) updateData.inputFileUrl = meta.inputFileUrl;
					if (meta.inputFileKey) updateData.inputFileKey = meta.inputFileKey;
					if (meta.outputFileUrl) updateData.outputFileUrl = meta.outputFileUrl;
					if (meta.outputFileKey) updateData.outputFileKey = meta.outputFileKey;
					if (meta.originalFileName)
						updateData.originalFileName = meta.originalFileName;
					if (meta.fileSize) updateData.fileSize = meta.fileSize;
					if (meta.executionLog) updateData.executionLog = meta.executionLog;
				}

				await db
					.update(transformationJobs)
					.set(updateData)
					.where(eq(transformationJobs.id, id));
			},
			catch: (error) =>
				new DbError({
					op: 'updateJobStatus',
					cause: error,
				}),
		}),

	createJob: (
		organizationId: string,
		configurationId: string,
		fileName: string,
	) =>
		Effect.tryPromise({
			try: async () => {
				const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

				await db.insert(transformationJobs).values({
					id,
					organizationId,
					configurationId,
					createdBy: 'system', // TODO: Get from auth context
					status: 'pending',
					originalFileName: fileName,
					createdAt: new Date(),
				});

				return id;
			},
			catch: (error) =>
				new DbError({
					op: 'createJob',
					cause: error,
				}),
		}),

	getJob: (id: string) =>
		Effect.tryPromise({
			try: async () => {
				const [job] = await db
					.select()
					.from(transformationJobs)
					.where(eq(transformationJobs.id, id))
					.limit(1);

				if (!job) {
					throw new Error(`Job ${id} not found`);
				}

				const metadata: JobMetadata | undefined =
					job.startedAt ||
					job.completedAt ||
					job.outputFileUrl ||
					job.errorMessage ||
					job.inputFileUrl ||
					job.inputFileKey ||
					job.outputFileKey ||
					job.originalFileName ||
					job.fileSize ||
					job.executionLog
						? {
								startedAt: job.startedAt || undefined,
								completedAt: job.completedAt || undefined,
								downloadUrl: job.outputFileUrl || undefined,
								error: job.errorMessage || undefined,
								inputFileUrl: job.inputFileUrl || undefined,
								inputFileKey: job.inputFileKey || undefined,
								outputFileUrl: job.outputFileUrl || undefined,
								outputFileKey: job.outputFileKey || undefined,
								originalFileName: job.originalFileName || undefined,
								fileSize: job.fileSize || undefined,
								executionLog: job.executionLog
									? Array.isArray(job.executionLog)
										? job.executionLog
										: []
									: undefined,
							}
						: undefined;

				return {
					id: job.id,
					status: job.status as JobStatus,
					organizationId: job.organizationId,
					configurationId: job.configurationId,
					fileName: job.originalFileName || '',
					metadata,
				};
			},
			catch: (error) =>
				new DbError({
					op: 'getJob',
					cause: error,
				}),
		}),

	createConfiguration: (input: ConfigurationInput) =>
		Effect.tryPromise({
			try: async () => {
				const [config] = await db
					.insert(configurations)
					.values({
						id: input.id,
						organizationId: input.organizationId,
						name: input.name,
						description: input.description,
						conversionType: input.conversionType,
						inputFormat: input.inputFormat,
						rules: input.rules,
						outputFormat: input.outputFormat,
						callbackUrl: input.callbackUrl,
						version: input.version,
						createdBy: input.createdBy,
					})
					.returning();

				return {
					id: config.id,
					organizationId: config.organizationId,
					name: config.name,
					description: config.description || undefined,
					rules: config.rules as Configuration['rules'],
					outputFormat: config.outputFormat as Configuration['outputFormat'],
					conversionType:
						config.conversionType as Configuration['conversionType'],
					inputFormat: config.inputFormat as Configuration['inputFormat'],
					version: config.version,
					isActive: config.isActive,
					createdBy: config.createdBy,
					createdAt: config.createdAt,
					updatedAt: config.updatedAt,
				};
			},
			catch: (error) =>
				new DbError({
					op: 'createConfiguration',
					cause: error,
				}),
		}),

	updateConfiguration: (
		id: string,
		updates: Partial<
			Omit<ConfigurationInput, 'id' | 'organizationId' | 'createdBy'>
		>,
	) =>
		Effect.tryPromise({
			try: async () => {
				const [config] = await db
					.update(configurations)
					.set({
						...updates,
						updatedAt: new Date(),
					})
					.where(eq(configurations.id, id))
					.returning();

				if (!config) {
					throw new ConfigNotFound({ configurationId: id });
				}

				return {
					id: config.id,
					organizationId: config.organizationId,
					name: config.name,
					description: config.description || undefined,
					rules: config.rules as Configuration['rules'],
					outputFormat: config.outputFormat as Configuration['outputFormat'],
					conversionType:
						config.conversionType as Configuration['conversionType'],
					inputFormat: config.inputFormat as Configuration['inputFormat'],
					version: config.version,
					isActive: config.isActive,
					createdBy: config.createdBy,
					createdAt: config.createdAt,
					updatedAt: config.updatedAt,
				};
			},
			catch: (error) => {
				if (error instanceof ConfigNotFound) {
					return error;
				}
				return new DbError({
					op: 'updateConfiguration',
					cause: error,
				});
			},
		}),

	deleteConfiguration: (id: string) =>
		Effect.tryPromise({
			try: async () => {
				await db.delete(configurations).where(eq(configurations.id, id));
			},
			catch: (error) =>
				new DbError({
					op: 'deleteConfiguration',
					cause: error,
				}),
		}),

	getConfigurations: (
		organizationId: string,
		filters?: { search?: string; offset?: number; limit?: number },
	) =>
		Effect.tryPromise({
			try: async () => {
				const conditions = [eq(configurations.organizationId, organizationId)];
				if (filters?.search) {
					conditions.push(ilike(configurations.name, `%${filters.search}%`));
				}

				const configs = await db
					.select()
					.from(configurations)
					.where(and(...conditions))
					.orderBy(desc(configurations.createdAt))
					.offset(filters?.offset || 0)
					.limit(filters?.limit || 10);

				return configs.map((config) => ({
					id: config.id,
					organizationId: config.organizationId,
					name: config.name,
					description: config.description || undefined,
					rules: config.rules as Configuration['rules'],
					outputFormat: config.outputFormat as Configuration['outputFormat'],
					conversionType:
						config.conversionType as Configuration['conversionType'],
					inputFormat: config.inputFormat as Configuration['inputFormat'],
					version: config.version,
					isActive: config.isActive,
					createdBy: config.createdBy,
					createdAt: config.createdAt,
					updatedAt: config.updatedAt,
				}));
			},
			catch: (error) =>
				new DbError({
					op: 'getConfigurations',
					cause: error,
				}),
		}),

	getConfigurationCount: (organizationId: string, search?: string) =>
		Effect.tryPromise({
			try: async () => {
				const conditions = [eq(configurations.organizationId, organizationId)];
				if (search) {
					conditions.push(ilike(configurations.name, `%${search}%`));
				}

				const [result] = await db
					.select({ count: count() })
					.from(configurations)
					.where(and(...conditions));

				return result?.count || 0;
			},
			catch: (error) =>
				new DbError({
					op: 'getConfigurationCount',
					cause: error,
				}),
		}),

	createConfigurationVersion: (input: ConfigurationVersionInput) =>
		Effect.tryPromise({
			try: async () => {
				await db.insert(configurationVersions).values({
					id: input.id,
					configurationId: input.configurationId,
					version: input.version,
					rules: input.rules,
					outputFormat: input.outputFormat,
					createdBy: input.createdBy,
				});
			},
			catch: (error) =>
				new DbError({
					op: 'createConfigurationVersion',
					cause: error,
				}),
		}),
});

export const DrizzleDatabaseLayer = Layer.succeed(
	DatabaseService,
	DrizzleDatabaseService,
);
