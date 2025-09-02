import { z } from 'zod';

export const updateUserSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	image: z.string().url('Invalid image URL').nullable().optional(),
});
