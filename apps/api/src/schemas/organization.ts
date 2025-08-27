import { z } from 'zod';

export const createOrganizationSchema = z.object({
	name: z.string().min(1, 'Organization name is required'),
	slug: z.string().min(1, 'Organization slug is required'),
	logo: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional(),
	switchOrganization: z.boolean().optional().default(true),
});
