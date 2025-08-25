import { relations } from 'drizzle-orm';
import {
	boolean,
	inet,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

// Organizations table
export const organizations = pgTable('organizations', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 255 }).notNull(),
	plan: varchar('plan', { length: 50 }).default('free'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull(),
	email: varchar('email', { length: 255 }).unique().notNull(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	role: varchar('role', { length: 50 }).default('member').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Configurations table
export const configurations = pgTable('configurations', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	rules: jsonb('rules').notNull(),
	outputFormat: jsonb('output_format').notNull(),
	version: integer('version').default(1).notNull(),
	isActive: boolean('is_active').default(true).notNull(),
	createdBy: uuid('created_by')
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Configuration versions table
export const configurationVersions = pgTable('configuration_versions', {
	id: uuid('id').primaryKey().defaultRandom(),
	configurationId: uuid('configuration_id')
		.references(() => configurations.id)
		.notNull(),
	version: integer('version').notNull(),
	rules: jsonb('rules').notNull(),
	outputFormat: jsonb('output_format').notNull(),
	createdBy: uuid('created_by')
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Transformation jobs table
export const transformationJobs = pgTable('transformation_jobs', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull(),
	configurationId: uuid('configuration_id')
		.references(() => configurations.id)
		.notNull(),
	status: varchar('status', { length: 50 }).default('pending').notNull(),
	inputFileUrl: text('input_file_url'),
	outputFileUrl: text('output_file_url'),
	errorMessage: text('error_message'),
	executionLog: jsonb('execution_log'),
	startedAt: timestamp('started_at'),
	completedAt: timestamp('completed_at'),
	createdBy: uuid('created_by')
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// API keys table
export const apiKeys = pgTable('api_keys', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull(),
	keyHash: varchar('key_hash', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }),
	permissions: jsonb('permissions'),
	lastUsedAt: timestamp('last_used_at'),
	createdBy: uuid('created_by')
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	expiresAt: timestamp('expires_at'),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull(),
	userId: uuid('user_id').references(() => users.id),
	action: varchar('action', { length: 100 }).notNull(),
	resourceType: varchar('resource_type', { length: 50 }),
	resourceId: uuid('resource_id'),
	ipAddress: inet('ip_address'),
	userAgent: text('user_agent'),
	requestBody: jsonb('request_body'),
	responseStatus: integer('response_status'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
	users: many(users),
	configurations: many(configurations),
	transformationJobs: many(transformationJobs),
	apiKeys: many(apiKeys),
	auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id],
	}),
	configurations: many(configurations),
	transformationJobs: many(transformationJobs),
	apiKeys: many(apiKeys),
	auditLogs: many(auditLogs),
	configurationVersions: many(configurationVersions),
}));

export const configurationsRelations = relations(
	configurations,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [configurations.organizationId],
			references: [organizations.id],
		}),
		createdBy: one(users, {
			fields: [configurations.createdBy],
			references: [users.id],
		}),
		transformationJobs: many(transformationJobs),
		versions: many(configurationVersions),
	}),
);

export const configurationVersionsRelations = relations(
	configurationVersions,
	({ one }) => ({
		configuration: one(configurations, {
			fields: [configurationVersions.configurationId],
			references: [configurations.id],
		}),
		createdBy: one(users, {
			fields: [configurationVersions.createdBy],
			references: [users.id],
		}),
	}),
);

export const transformationJobsRelations = relations(
	transformationJobs,
	({ one }) => ({
		organization: one(organizations, {
			fields: [transformationJobs.organizationId],
			references: [organizations.id],
		}),
		configuration: one(configurations, {
			fields: [transformationJobs.configurationId],
			references: [configurations.id],
		}),
		createdBy: one(users, {
			fields: [transformationJobs.createdBy],
			references: [users.id],
		}),
	}),
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	organization: one(organizations, {
		fields: [apiKeys.organizationId],
		references: [organizations.id],
	}),
	createdBy: one(users, {
		fields: [apiKeys.createdBy],
		references: [users.id],
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	organization: one(organizations, {
		fields: [auditLogs.organizationId],
		references: [organizations.id],
	}),
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id],
	}),
}));
