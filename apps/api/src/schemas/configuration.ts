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
		sourceSheets: z.array(z.string()).optional(),
		operation: z.enum(['append', 'merge']),
	}),
});

const evaluateFormulasRuleSchema = baseRuleSchema.extend({
	type: z.literal('EVALUATE_FORMULAS'),
	params: z.object({
		enabled: z.boolean(),
	}),
});

const replaceCharactersRuleSchema = baseRuleSchema.extend({
	type: z.literal('REPLACE_CHARACTERS'),
	params: z.object({
		replacements: z.array(
			z.object({
				find: z.string(),
				replace: z.string(),
				scope: z.enum(['all', 'specific_columns', 'specific_rows']).optional().default('all'),
				columns: z.array(z.string()).optional(),
				rows: z.array(z.number().min(1)).optional(), // 1-based row numbers
			}),
		),
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
	replaceCharactersRuleSchema,
]);

const csvOutputFormatSchema = z.object({
	type: z.literal('CSV'),
	delimiter: z.string().default(','),
	encoding: z.enum(['UTF-8', 'UTF-16', 'ASCII']).default('UTF-8'),
	includeHeaders: z.boolean().default(true),
});

const pdfOutputFormatSchema = z.object({
	type: z.literal('PDF'),
	pageSize: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
	orientation: z.enum(['portrait', 'landscape']).default('portrait'),
	margins: z
		.object({
			top: z.number().default(20),
			bottom: z.number().default(20),
			left: z.number().default(20),
			right: z.number().default(20),
		})
		.default({ top: 20, bottom: 20, left: 20, right: 20 }),
});

const jsonOutputFormatSchema = z.object({
	type: z.literal('JSON'),
	prettyPrint: z.boolean().default(true),
	encoding: z.enum(['UTF-8', 'UTF-16']).default('UTF-8'),
});

const outputFormatSchema = z.discriminatedUnion('type', [
	csvOutputFormatSchema,
	pdfOutputFormatSchema,
	jsonOutputFormatSchema,
]);

export const outputValidationSchema = z.object({
	enabled: z.boolean(),
	expectedColumnCount: z.number().min(1, 'Expected column count must be at least 1'),
	notificationEmails: z.array(z.string().email('Invalid email address')).optional(),
});

export const createSchema = z.object({
	name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
	description: z.string().max(1000, 'Description too long').optional(),
	conversionType: z
		.enum(['XLSX_TO_CSV', 'DOCX_TO_PDF', 'HTML_TO_PDF', 'PDF_TO_CSV', 'JSON_TO_CSV', 'CSV_TO_JSON'])
		.default('XLSX_TO_CSV'),
	inputFormat: z.enum(['XLSX', 'DOCX', 'HTML', 'PDF', 'JSON', 'CSV']).default('XLSX'),
	outputFormat: outputFormatSchema,
	rules: z.array(transformationRuleSchema).min(1, 'At least one rule is required'),
	callbackUrl: z.string().url('Invalid callback URL').optional(),
	webhookUrlId: z.string().optional(),
	outputValidation: outputValidationSchema.optional().nullable(),
});

export const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
	description: z.string().max(1000, 'Description too long').optional(),
	conversionType: z
		.enum(['XLSX_TO_CSV', 'DOCX_TO_PDF', 'HTML_TO_PDF', 'PDF_TO_CSV', 'JSON_TO_CSV', 'CSV_TO_JSON'])
		.optional(),
	inputFormat: z.enum(['XLSX', 'DOCX', 'HTML', 'PDF', 'JSON', 'CSV']).optional(),
	outputFormat: outputFormatSchema.optional(),
	rules: z.array(transformationRuleSchema).min(1, 'At least one rule is required').optional(),
	callbackUrl: z.url('Invalid callback URL').optional().nullable(),
	webhookUrlId: z.string().optional().nullable(),
	outputValidation: outputValidationSchema.optional().nullable(),
});

export const configurationQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	search: z.string().optional(),
});

export type CreateRequest = z.infer<typeof createSchema>;
export type UpdateRequest = z.infer<typeof updateSchema>;
export type Query = z.infer<typeof configurationQuerySchema>;
