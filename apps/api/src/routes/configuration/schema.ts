import { z } from 'zod';

const baseRuleSchema = z.object({
	id: z.string(),
	type: z.string(),
});

const selectWorksheetRuleSchema = baseRuleSchema.extend({
	type: z.literal('SELECT_WORKSHEET'),
	params: z.object({
		value: z.string(),
		type: z.enum(['name', 'pattern', 'index']),
	}),
});

const validateColumnsRuleSchema = baseRuleSchema.extend({
	type: z.literal('VALIDATE_COLUMNS'),
	params: z.object({
		numOfColumns: z.number().min(1),
		onFailure: z.enum(['stop', 'notify', 'continue']),
	}),
});

const unmergeAndFillRuleSchema = baseRuleSchema.extend({
	type: z.literal('UNMERGE_AND_FILL'),
	params: z.object({
		columns: z.array(z.string()),
		fillDirection: z.enum(['down', 'up']),
	}),
});

const deleteRowsRuleSchema = baseRuleSchema.extend({
	type: z.literal('DELETE_ROWS'),
	params: z.object({
		method: z.enum(['condition', 'rows']).default('condition'),
		condition: z
			.object({
				type: z.enum(['contains', 'empty', 'pattern']),
				column: z.string().optional(),
				value: z.string().optional(),
			})
			.optional(),
		rows: z.array(z.number().min(1)).optional(), // 1-based row numbers
	}),
});

const deleteColumnsRuleSchema = baseRuleSchema.extend({
	type: z.literal('DELETE_COLUMNS'),
	params: z.object({
		columns: z.array(z.string()),
	}),
});

const combineWorksheetsRuleSchema = baseRuleSchema.extend({
	type: z.literal('COMBINE_WORKSHEETS'),
	params: z.object({
		sourceSheets: z.array(z.string()),
		operation: z.enum(['append', 'merge']),
	}),
});

const evaluateFormulasRuleSchema = baseRuleSchema.extend({
	type: z.literal('EVALUATE_FORMULAS'),
	params: z.object({
		enabled: z.boolean(),
	}),
});

const transformationRuleSchema = z.discriminatedUnion('type', [
	selectWorksheetRuleSchema,
	validateColumnsRuleSchema,
	unmergeAndFillRuleSchema,
	deleteRowsRuleSchema,
	deleteColumnsRuleSchema,
	combineWorksheetsRuleSchema,
	evaluateFormulasRuleSchema,
]);

const outputFormatSchema = z.object({
	type: z.literal('CSV'),
	delimiter: z.string().default(','),
	encoding: z.enum(['UTF-8', 'UTF-16', 'ASCII']).default('UTF-8'),
	includeHeaders: z.boolean().default(true),
});

export const createSchema = z.object({
	name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
	description: z.string().max(1000, 'Description too long').optional(),
	rules: z
		.array(transformationRuleSchema)
		.min(1, 'At least one rule is required'),
	outputFormat: outputFormatSchema,
});

export const updateSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(255, 'Name too long')
		.optional(),
	description: z.string().max(1000, 'Description too long').optional(),
	rules: z
		.array(transformationRuleSchema)
		.min(1, 'At least one rule is required')
		.optional(),
	outputFormat: outputFormatSchema.optional(),
});

export const configurationQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	search: z.string().optional(),
});

export type CreateRequest = z.infer<typeof createSchema>;
export type UpdateRequest = z.infer<typeof updateSchema>;
export type Query = z.infer<typeof configurationQuerySchema>;
