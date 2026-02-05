import { relations } from 'drizzle-orm';
import {
	boolean,
	inet,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
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
	activeOrganizationId: text('active_organization_id'),
	twoFactorEnabled: boolean('two_factor_enabled')
		.$defaultFn(() => false)
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

export const organizationWebhooks = pgTable('organization_webhook', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	url: text('url').notNull(),
	secret: text('secret'),
	lastUsedAt: timestamp('last_used_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
	conversionType: varchar('conversion_type', { length: 50 }).default('XLSX_TO_CSV').notNull(),
	inputFormat: varchar('input_format', { length: 20 }).default('XLSX').notNull(),
	outputFormat: jsonb('output_format').notNull(),
	rules: jsonb('rules').notNull(),
	outputValidation: jsonb('output_validation'),
	version: integer('version').default(1).notNull(),
	isActive: boolean('is_active').default(true).notNull(),
	callbackUrl: text('callback_url'),
	webhookUrlId: text('webhook_url_id').references(() => organizationWebhooks.id),
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
	inputFileKey: text('input_file_key'), // Storage key for the input file
	outputFileUrl: text('output_file_url'),
	outputFileKey: text('output_file_key'), // Storage key for the output file
	originalFileName: varchar('original_file_name', { length: 255 }),
	fileSize: integer('file_size'), // Size in bytes
	errorMessage: text('error_message'),
	validationResult: jsonb('validation_result'),
	executionLog: jsonb('execution_log'),
	callbackUrl: text('callback_url'),
	uid: text('uid'), // User-provided identifier for tracking this job
	webhookDelivered: boolean('webhook_delivered').default(false), // Has webhook been successfully delivered
	webhookAttempts: integer('webhook_attempts').default(0), // Number of webhook delivery attempts
	webhookLastAttempt: timestamp('webhook_last_attempt'), // Last webhook attempt timestamp
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

export const subscriptionPlans = pgTable('subscription_plan', {
	id: text('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	monthlyConversionLimit: integer('monthly_conversion_limit'),
	concurrentConversionLimit: integer('concurrent_conversion_limit'),
	maxFileSizeMb: integer('max_file_size_mb'),
	priceCents: integer('price_cents').notNull(),
	billingInterval: varchar('billing_interval', { length: 20 }).notNull(),
	overagePriceCents: integer('overage_price_cents'),
	features: jsonb('features'),
	active: boolean('active').default(true).notNull(),
	isDefault: boolean('is_default').default(false).notNull(),
	isPublic: boolean('is_public').default(true).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizationSubscriptions = pgTable('organization_subscription', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	planId: text('plan_id')
		.references(() => subscriptionPlans.id)
		.notNull(),
	stripeSubscriptionId: text('stripe_subscription_id'),
	status: varchar('status', { length: 50 }).notNull(),
	currentPeriodStart: timestamp('current_period_start').notNull(),
	currentPeriodEnd: timestamp('current_period_end').notNull(),
	overrideMonthlyLimit: integer('override_monthly_limit'),
	overrideConcurrentLimit: integer('override_concurrent_limit'),
	overrideMaxFileSizeMb: integer('override_max_file_size_mb'),
	overrideOveragePriceCents: integer('override_overage_price_cents'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usageRecords = pgTable(
	'usage_record',
	{
		id: text('id').primaryKey(),
		organizationId: text('organization_id')
			.references(() => organization.id)
			.notNull(),
		month: integer('month').notNull(),
		year: integer('year').notNull(),
		conversionCount: integer('conversion_count').default(0).notNull(),
		overageCount: integer('overage_count').default(0).notNull(),
		conversionTypeBreakdown: jsonb('conversion_type_breakdown'),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(table) => ({
		uniqueOrgMonthYear: unique().on(table.organizationId, table.month, table.year),
	}),
);

export const activeConversions = pgTable('active_conversion', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	jobId: text('job_id')
		.references(() => transformationJobs.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	startedAt: timestamp('started_at').defaultNow().notNull(),
});

export const billingEvents = pgTable('billing_event', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	eventType: varchar('event_type', { length: 50 }).notNull(),
	eventData: jsonb('event_data').notNull(),
	stripeEventId: text('stripe_event_id'),
	processed: boolean('processed').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const twoFactor = pgTable('two_factor', {
	id: text('id').primaryKey(),
	secret: text('secret').notNull(),
	backupCodes: text('backup_codes').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
});

// Platform admin table for app-level admin access
export const platformAdmins = pgTable('platform_admin', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	role: varchar('role', { length: 50 }).default('admin').notNull(), // admin, support, etc.
	permissions: jsonb('permissions'), // Optional: granular permissions
	require2fa: boolean('require_2fa').default(true).notNull(),
	last2faVerifiedAt: timestamp('last_2fa_verified_at'),
	trustedIps: text('trusted_ips').array(), // Array of trusted IP addresses
	createdAt: timestamp('created_at').defaultNow().notNull(),
	createdBy: text('created_by').references(() => user.id),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Platform audit logs for admin actions
export const platformAuditLogs = pgTable('platform_audit_logs', {
	id: text('id').primaryKey(),
	adminId: text('admin_id').references(() => platformAdmins.id),
	action: varchar('action', { length: 100 }).notNull(),
	resourceType: varchar('resource_type', { length: 50 }),
	resourceId: text('resource_id'),
	changes: jsonb('changes'),
	ipAddress: inet('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Feature flags management
export const featureFlags = pgTable('feature_flags', {
	id: text('id').primaryKey(),
	name: varchar('name', { length: 100 }).unique().notNull(),
	description: text('description'),
	enabled: boolean('enabled').default(false).notNull(),
	rolloutPercentage: integer('rollout_percentage').default(0),
	workspaceOverrides: jsonb('workspace_overrides'), // {workspace_id: boolean}
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// System health metrics
export const systemMetrics = pgTable('system_metrics', {
	id: text('id').primaryKey(),
	metricType: varchar('metric_type', { length: 50 }).notNull(), // api_latency, error_rate, etc
	value: integer('value').notNull(),
	metadata: jsonb('metadata'),
	recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const organizationRelations = relations(organization, ({ many, one }) => ({
	members: many(member),
	configurations: many(configurations),
	transformationJobs: many(transformationJobs),
	apiKeys: many(apiKeys),
	auditLogs: many(auditLogs),
	invitations: many(invitation),
	webhooks: many(organizationWebhooks),
	subscription: one(organizationSubscriptions),
	usageRecords: many(usageRecords),
	activeConversions: many(activeConversions),
	billingEvents: many(billingEvents),
	notifications: many(notifications),
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
	passkeys: many(passkey),
}));

export const organizationWebhooksRelations = relations(organizationWebhooks, ({ one, many }) => ({
	organization: one(organization, {
		fields: [organizationWebhooks.organizationId],
		references: [organization.id],
	}),
	configurations: many(configurations),
}));

export const configurationsRelations = relations(configurations, ({ one, many }) => ({
	organization: one(organization, {
		fields: [configurations.organizationId],
		references: [organization.id],
	}),
	createdBy: one(user, {
		fields: [configurations.createdBy],
		references: [user.id],
	}),
	webhookUrl: one(organizationWebhooks, {
		fields: [configurations.webhookUrlId],
		references: [organizationWebhooks.id],
	}),
	transformationJobs: many(transformationJobs),
	versions: many(configurationVersions),
}));

export const configurationVersionsRelations = relations(configurationVersions, ({ one }) => ({
	configuration: one(configurations, {
		fields: [configurationVersions.configurationId],
		references: [configurations.id],
	}),
	createdBy: one(user, {
		fields: [configurationVersions.createdBy],
		references: [user.id],
	}),
}));

export const transformationJobsRelations = relations(transformationJobs, ({ one }) => ({
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
}));

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

export const passkey = pgTable('passkey', {
	id: text('id').primaryKey(),
	name: text('name'),
	publicKey: text('public_key').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	credentialID: text('credential_id').notNull().unique(),
	counter: integer('counter').notNull(),
	deviceType: text('device_type').notNull(),
	backedUp: boolean('backed_up').notNull(),
	transports: text('transports'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	aaguid: text('aaguid'),
});

export const passkeyRelations = relations(passkey, ({ one }) => ({
	user: one(user, {
		fields: [passkey.userId],
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

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
	subscriptions: many(organizationSubscriptions),
}));

export const organizationSubscriptionsRelations = relations(
	organizationSubscriptions,
	({ one }) => ({
		organization: one(organization, {
			fields: [organizationSubscriptions.organizationId],
			references: [organization.id],
		}),
		plan: one(subscriptionPlans, {
			fields: [organizationSubscriptions.planId],
			references: [subscriptionPlans.id],
		}),
	}),
);

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
	organization: one(organization, {
		fields: [usageRecords.organizationId],
		references: [organization.id],
	}),
}));

export const activeConversionsRelations = relations(activeConversions, ({ one }) => ({
	organization: one(organization, {
		fields: [activeConversions.organizationId],
		references: [organization.id],
	}),
	job: one(transformationJobs, {
		fields: [activeConversions.jobId],
		references: [transformationJobs.id],
	}),
}));

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
	organization: one(organization, {
		fields: [billingEvents.organizationId],
		references: [organization.id],
	}),
}));

export const platformAdminsRelations = relations(platformAdmins, ({ one, many }) => ({
	user: one(user, {
		fields: [platformAdmins.userId],
		references: [user.id],
	}),
	createdByUser: one(user, {
		fields: [platformAdmins.createdBy],
		references: [user.id],
	}),
	auditLogs: many(platformAuditLogs),
}));

export const platformAuditLogsRelations = relations(platformAuditLogs, ({ one }) => ({
	admin: one(platformAdmins, {
		fields: [platformAuditLogs.adminId],
		references: [platformAdmins.id],
	}),
}));

// Webhook delivery tracking (idempotency, retries, DLQ)
export const webhookDeliveries = pgTable('webhook_delivery', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id)
		.notNull(),
	configurationId: text('configuration_id')
		.references(() => configurations.id)
		.notNull(),
	targetUrl: text('target_url').notNull(),
	webhookUrlId: text('webhook_url_id').references(() => organizationWebhooks.id),
	eventType: varchar('event_type', { length: 100 }).notNull(),
	idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
	payload: jsonb('payload').notNull(),
	payloadHash: varchar('payload_hash', { length: 128 }).notNull(),
	signature: text('signature'),
	signedAt: timestamp('signed_at'),
	status: varchar('status', { length: 20 }).default('pending').notNull(),
	attempts: integer('attempts').default(0).notNull(),
	lastAttempt: timestamp('last_attempt'),
	nextAttempt: timestamp('next_attempt'),
	responseStatus: integer('response_status'),
	responseBody: text('response_body'),
	error: text('error'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notification', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id')
		.references(() => organization.id, { onDelete: 'cascade' })
		.notNull(),
	userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
	type: varchar('type', { length: 50 }).notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	message: text('message').notNull(),
	metadata: jsonb('metadata'),
	read: boolean('read').default(false).notNull(),
	emailSent: boolean('email_sent').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
	organization: one(organization, {
		fields: [notifications.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id],
	}),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
	organization: one(organization, {
		fields: [webhookDeliveries.organizationId],
		references: [organization.id],
	}),
	configuration: one(configurations, {
		fields: [webhookDeliveries.configurationId],
		references: [configurations.id],
	}),
	webhookUrl: one(organizationWebhooks, {
		fields: [webhookDeliveries.webhookUrlId],
		references: [organizationWebhooks.id],
	}),
}));
