import { z } from 'zod';

export const createOrganizationSchema = z.object({
	name: z.string().min(1, 'Organization name is required'),
	slug: z.string().min(1, 'Organization slug is required'),
	logo: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional(),
	switchOrganization: z.boolean().optional().default(true),
});

export const updateOrganizationSchema = z.object({
	name: z.string().min(1, 'Organization name is required').optional(),
	logo: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional(),
});

export const organizationWebhookSchema = z.object({
	name: z.string().min(1, 'Webhook name is required').max(255, 'Name too long'),
	url: z.string().url('Invalid webhook URL'),
	secret: z.string().min(1, 'Webhook secret cannot be empty').optional(),
	isDefault: z.boolean().default(false),
});

export const createOrganizationWebhookSchema = organizationWebhookSchema;

export const updateOrganizationWebhookSchema = organizationWebhookSchema
	.partial()
	.omit({ isDefault: true });

export const setDefaultWebhookSchema = z.object({
	webhookId: z.string().min(1, 'Webhook ID is required'),
});
