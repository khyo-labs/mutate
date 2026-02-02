import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { config } from '@/config.js';

import type { CsvDiff } from './csv-differ.js';
import type { ParsedCsv } from './csv-parser.js';

const ruleSchema = z.array(
	z.discriminatedUnion('type', [
		z.object({
			type: z.literal('SELECT_WORKSHEET'),
			params: z.object({
				value: z.string(),
				type: z.enum(['name', 'pattern', 'index']),
			}),
		}),
		z.object({
			type: z.literal('VALIDATE_COLUMNS'),
			params: z.object({
				numOfColumns: z.number().min(1),
				onFailure: z.enum(['stop', 'notify', 'continue']),
			}),
		}),
		z.object({
			type: z.literal('UNMERGE_AND_FILL'),
			params: z.object({
				columns: z.array(z.string()),
				fillDirection: z.enum(['down', 'up']),
			}),
		}),
		z.object({
			type: z.literal('DELETE_ROWS'),
			params: z.object({
				method: z.enum(['condition', 'rows']),
				condition: z
					.object({
						type: z.enum(['contains', 'empty', 'pattern']),
						column: z.string().optional(),
						value: z.string().optional(),
					})
					.optional(),
				rows: z.array(z.number().min(1)).optional(),
			}),
		}),
		z.object({
			type: z.literal('DELETE_COLUMNS'),
			params: z.object({
				columns: z.array(z.string()),
			}),
		}),
		z.object({
			type: z.literal('COMBINE_WORKSHEETS'),
			params: z.object({
				sourceSheets: z.array(z.string()).optional(),
				operation: z.enum(['append', 'merge']),
			}),
		}),
		z.object({
			type: z.literal('EVALUATE_FORMULAS'),
			params: z.object({
				enabled: z.boolean(),
			}),
		}),
		z.object({
			type: z.literal('REPLACE_CHARACTERS'),
			params: z.object({
				replacements: z.array(
					z.object({
						find: z.string(),
						replace: z.string(),
						scope: z.enum(['all', 'specific_columns', 'specific_rows']).optional(),
						columns: z.array(z.string()).optional(),
						rows: z.array(z.number().min(1)).optional(),
					}),
				),
			}),
		}),
	]),
);

const SYSTEM_PROMPT = `You are a data transformation rule generator. You analyze an input XLSX spreadsheet and an expected CSV output, then generate an array of transformation rules that would convert the input into the output.

Available rule types:

1. SELECT_WORKSHEET - Select a worksheet by name, pattern, or index
   params: { value: string, type: "name" | "pattern" | "index" }

2. VALIDATE_COLUMNS - Validate expected column count
   params: { numOfColumns: number, onFailure: "stop" | "notify" | "continue" }

3. UNMERGE_AND_FILL - Unmerge cells and fill values
   params: { columns: string[], fillDirection: "down" | "up" }

4. DELETE_ROWS - Delete rows by condition or row numbers (1-based)
   params: { method: "condition" | "rows", condition?: { type: "contains" | "empty" | "pattern", column?: string, value?: string }, rows?: number[] }

5. DELETE_COLUMNS - Remove specified columns by header name
   params: { columns: string[] }

6. COMBINE_WORKSHEETS - Merge multiple worksheets
   params: { sourceSheets?: string[], operation: "append" | "merge" }

7. EVALUATE_FORMULAS - Calculate formula values
   params: { enabled: boolean }

8. REPLACE_CHARACTERS - Find and replace text in cells
   params: { replacements: [{ find: string, replace: string, scope?: "all" | "specific_columns" | "specific_rows", columns?: string[], rows?: number[] }] }

Rules:
- Only generate rules that are needed to transform the input into the output.
- Order rules logically: worksheet selection first, then structural changes (delete columns/rows), then content changes (replace characters).
- Use DELETE_COLUMNS when columns are removed between input and output.
- Use DELETE_ROWS with method "rows" when specific rows are removed, or method "condition" when a pattern is detected.
- Use REPLACE_CHARACTERS when cell values change between input and output.
- Do not generate SELECT_WORKSHEET, COMBINE_WORKSHEETS, UNMERGE_AND_FILL, or EVALUATE_FORMULAS unless the hint or data clearly indicates they are needed.
- Be precise with column names — use exact header strings from the input XLSX.`;

type GenerateRulesInput = {
	inputCsv: ParsedCsv;
	outputCsv: ParsedCsv;
	diff: CsvDiff;
	hint?: string;
};

export async function generateRules({ inputCsv, outputCsv, diff, hint }: GenerateRulesInput) {
	if (!config.ANTHROPIC_API_KEY) {
		throw new AiError('AI_NOT_CONFIGURED', 'Anthropic API key is not configured');
	}

	const anthropic = createAnthropic({ apiKey: config.ANTHROPIC_API_KEY });

	const userPrompt = buildUserPrompt(inputCsv, outputCsv, diff, hint);

	const result = await generateObject({
		model: anthropic('claude-sonnet-4-20250514'),
		schema: z.object({ rules: ruleSchema }),
		system: SYSTEM_PROMPT,
		prompt: userPrompt,
		temperature: 0,
	});

	return result.object.rules.map((rule) => ({
		...rule,
		id: nanoid(),
	}));
}

function buildUserPrompt(
	inputCsv: ParsedCsv,
	outputCsv: ParsedCsv,
	diff: CsvDiff,
	hint?: string,
): string {
	const lines: string[] = [];

	lines.push('## Input XLSX (first worksheet)');
	lines.push(`Headers (${inputCsv.totalColumns} columns): ${inputCsv.headers.join(', ')}`);
	lines.push(`Total rows: ${inputCsv.totalRows}`);
	if (inputCsv.rows.length > 0) {
		lines.push('Sample rows:');
		for (const row of inputCsv.rows.slice(0, 5)) {
			lines.push(`  ${row.join(', ')}`);
		}
	}

	lines.push('');
	lines.push('## Output CSV');
	lines.push(`Headers (${outputCsv.totalColumns} columns): ${outputCsv.headers.join(', ')}`);
	lines.push(`Total rows: ${outputCsv.totalRows}`);
	if (outputCsv.rows.length > 0) {
		lines.push('Sample rows:');
		for (const row of outputCsv.rows.slice(0, 5)) {
			lines.push(`  ${row.join(', ')}`);
		}
	}

	lines.push('');
	lines.push('## Pre-computed Diff');

	if (diff.removedColumns.length > 0) {
		lines.push(`Removed columns: ${diff.removedColumns.join(', ')}`);
	}
	if (diff.addedColumns.length > 0) {
		lines.push(`Added columns: ${diff.addedColumns.join(', ')}`);
	}

	lines.push(`Column count: ${diff.columnCountChange.input} → ${diff.columnCountChange.output}`);
	lines.push(`Row count: ${diff.rowCountChange.input} → ${diff.rowCountChange.output}`);

	if (diff.removedRowIndices.length > 0) {
		const display =
			diff.removedRowIndices.length <= 20
				? diff.removedRowIndices.join(', ')
				: `${diff.removedRowIndices.slice(0, 20).join(', ')}... (${diff.removedRowIndices.length} total)`;
		lines.push(`Removed row indices (1-based): ${display}`);
	}

	if (diff.characterReplacements.length > 0) {
		lines.push('Character replacements detected:');
		for (const rep of diff.characterReplacements) {
			lines.push(`  Column "${rep.column}":`);
			for (const ex of rep.examples) {
				lines.push(`    "${ex.from}" → "${ex.to}"`);
			}
		}
	}

	if (hint) {
		lines.push('');
		lines.push(`## User Hint`);
		lines.push(hint);
	}

	return lines.join('\n');
}

export class AiError extends Error {
	code: string;

	constructor(code: string, message: string) {
		super(message);
		this.code = code;
	}
}
