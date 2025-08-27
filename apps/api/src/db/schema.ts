import { relations } from 'drizzle-orm';
import {
	boolean,
	inet,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified')
		.$defaultFn(() => false)
		.notNull(),
	image: text('image'),
	createdAt: timestamp('created_at')
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => new Date())
		.notNull(),
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	activeOrganizationId: text('active_organization_id'),
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at')
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => new Date())
		.notNull(),
});

export const organization = pgTable('organization', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').unique(),
	logo: text('logo'),
	createdAt: timestamp('created_at').notNull(),
	metadata: text('metadata'),
});

export const member = pgTable('member', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	role: text('role').default('member').notNull(),
	createdAt: timestamp('created_at').notNull(),
});

export const invitation = pgTable('invitation', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: text('role'),
	status: text('status').default('pending').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	inviterId: text('inviter_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
});

export const configurations = pgTable('configuration', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	rules: jsonb('rules').notNull(),
	outputFormat: jsonb('output_format').notNull(),
	version: integer('version').default(1).notNull(),
	isActive: boolean('is_active').default(true).notNull(),
	createdBy: text('created_by')
		.references(() => user.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const configurationVersions = pgTable('configuration_version', {
	id: text('id').primaryKey(),
	configurationId: text('configuration_id')
		.references(() => configurations.id)
		.notNull(),
	version: integer('version').notNull(),
	rules: jsonb('rules').notNull(),
	outputFormat: jsonb('output_format').notNull(),
	createdBy: text('created_by')
		.references(() => user.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transformationJobs = pgTable('transformation_job', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	configurationId: text('configuration_id')
		.references(() => configurations.id)
		.notNull(),
	status: varchar('status', { length: 50 }).default('pending').notNull(),
	inputFileUrl: text('input_file_url'),
	outputFileUrl: text('output_file_url'),
	errorMessage: text('error_message'),
	executionLog: jsonb('execution_log'),
	startedAt: timestamp('started_at'),
	completedAt: timestamp('completed_at'),
	createdBy: text('created_by')
		.references(() => user.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_key', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	keyHash: varchar('key_hash', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }),
	permissions: jsonb('permissions'),
	lastUsedAt: timestamp('last_used_at'),
	createdBy: text('created_by')
		.references(() => user.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	expiresAt: timestamp('expires_at'),
});

export const auditLogs = pgTable('audit_log', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	userId: text('user_id').references(() => user.id),
	action: varchar('action', { length: 100 }).notNull(),
	resourceType: varchar('resource_type', { length: 50 }),
	resourceId: text('resource_id'),
	ipAddress: inet('ip_address'),
	userAgent: text('user_agent'),
	requestBody: jsonb('request_body'),
	responseStatus: integer('response_status'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	configurations: many(configurations),
	transformationJobs: many(transformationJobs),
	apiKeys: many(apiKeys),
	auditLogs: many(auditLogs),
	invitations: many(invitation),
}));

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(member),
	invitations: many(invitation),
	configurations: many(configurations),
	transformationJobs: many(transformationJobs),
	apiKeys: many(apiKeys),
	auditLogs: many(auditLogs),
	configurationVersions: many(configurationVersions),
}));

export const configurationsRelations = relations(
	configurations,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [configurations.organizationId],
			references: [organization.id],
		}),
		createdBy: one(user, {
			fields: [configurations.createdBy],
			references: [user.id],
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
		createdBy: one(user, {
			fields: [configurationVersions.createdBy],
			references: [user.id],
		}),
	}),
);

export const transformationJobsRelations = relations(
	transformationJobs,
	({ one }) => ({
		organization: one(organization, {
			fields: [transformationJobs.organizationId],
			references: [organization.id],
		}),
		configuration: one(configurations, {
			fields: [transformationJobs.configurationId],
			references: [configurations.id],
		}),
		createdBy: one(user, {
			fields: [transformationJobs.createdBy],
			references: [user.id],
		}),
	}),
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	organization: one(organization, {
		fields: [apiKeys.organizationId],
		references: [organization.id],
	}),
	createdBy: one(user, {
		fields: [apiKeys.createdBy],
		references: [user.id],
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	organization: one(organization, {
		fields: [auditLogs.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [auditLogs.userId],
		references: [user.id],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const memberRelations = relations(member, ({ one }) => ({
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
}));
