import { z } from 'zod';

export const createWorkspaceSchema = z.object({
	name: z.string().min(1, 'Workspace name is required'),
	slug: z.string().min(1, 'Workspace slug is required'),
	logo: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional(),
	switchWorkspace: z.boolean().optional().default(true),
});

export const updateWorkspaceSchema = z.object({
        name: z.string().min(1, 'Workspace name is required').optional(),
        slug: z
                .string()
                .min(1, 'Workspace slug is required')
                .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
                .refine((value) => !value.startsWith('-') && !value.endsWith('-'), {
                        message: 'Slug cannot start or end with a hyphen',
                })
                .optional(),
        logo: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
});

export const workspaceWebhookSchema = z.object({
	name: z.string().min(1, 'Webhook name is required').max(255, 'Name too long'),
	url: z.url('Invalid webhook URL'),
	secret: z.string().min(1, 'Webhook secret cannot be empty').optional(),
});

export const createWorkspaceWebhookSchema = workspaceWebhookSchema;

export const updateWorkspaceWebhookSchema = workspaceWebhookSchema.partial();
