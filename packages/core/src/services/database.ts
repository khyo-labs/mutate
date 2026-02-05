import { Context, Effect } from 'effect';

import { ConfigNotFound, DbError } from '../errors.js';
import type { Configuration, JobStatus } from '../types.js';

export interface JobMetadata {
	startedAt?: Date;
	completedAt?: Date;
	downloadUrl?: string;
	error?: string;
	inputFileUrl?: string;
	inputFileKey?: string;
	outputFileUrl?: string;
	outputFileKey?: string;
	originalFileName?: string;
	fileSize?: number;
	executionLog?: string[];
}

export interface ConfigurationInput {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	conversionType: string;
	inputFormat: any;
	rules: any;
	outputFormat: any;
	outputValidation?: any;
	callbackUrl?: string;
	version: number;
	createdBy: string;
}

export interface ConfigurationVersionInput {
	id: string;
	configurationId: string;
	version: number;
	rules: any;
	outputFormat: any;
	createdBy: string;
}

export interface DatabaseService {
	getConfiguration: (id: string) => Effect.Effect<Configuration, ConfigNotFound | DbError>;

	createConfiguration: (input: ConfigurationInput) => Effect.Effect<Configuration, DbError>;

	updateConfiguration: (
		id: string,
		updates: Partial<Omit<ConfigurationInput, 'id' | 'organizationId' | 'createdBy'>>,
	) => Effect.Effect<Configuration, ConfigNotFound | DbError>;

	deleteConfiguration: (id: string) => Effect.Effect<void, DbError>;

	getConfigurations: (
		organizationId: string,
		filters?: { search?: string; offset?: number; limit?: number },
	) => Effect.Effect<Configuration[], DbError>;

	getConfigurationCount: (
		organizationId: string,
		search?: string,
	) => Effect.Effect<number, DbError>;

	createConfigurationVersion: (input: ConfigurationVersionInput) => Effect.Effect<void, DbError>;

	updateJobStatus: (
		id: string,
		status: JobStatus,
		meta?: JobMetadata,
	) => Effect.Effect<void, DbError>;

	createJob: (
		organizationId: string,
		configurationId: string,
		fileName: string,
		userId: string,
	) => Effect.Effect<string, DbError>;

	getJob: (id: string) => Effect.Effect<
		{
			id: string;
			status: JobStatus;
			organizationId: string;
			configurationId: string;
			fileName: string;
			metadata?: JobMetadata;
		},
		DbError
	>;
}

export const DatabaseService = Context.GenericTag<DatabaseService>('@mutate/core/DatabaseService');
