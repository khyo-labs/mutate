import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError, WorksheetNotFoundError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { CombineWorksheetsRule } from '../types.js';

export function applyCombineWorksheets(
	state: TransformationState,
	rule: CombineWorksheetsRule,
) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;
		const { workbook, history } = state;
		const params = rule.params;

		const sourceSheets =
			params.sourceSheets && params.sourceSheets.length
				? params.sourceSheets
				: history;

		if (!sourceSheets || sourceSheets.length === 0) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'COMBINE_WORKSHEETS',
					reason: 'No source sheets provided and no prior selections found',
				}),
			);
		}

		yield* logger.info(`Combining worksheets`, {
			sourceSheets,
			operation: params.operation,
		});

		for (const sheetName of sourceSheets) {
			if (!workbook.Sheets[sheetName]) {
				return yield* Effect.fail(
					new WorksheetNotFoundError({
						sheetName,
						availableSheets: workbook.SheetNames,
					}),
				);
			}
		}

		const combinedSheetName = generateSheetName(workbook, 'Combined');

		try {
			if (params.operation === 'append') {
				const [first, ...rest] = sourceSheets;
				const base = XLSX.utils.sheet_to_json(workbook.Sheets[first], {
					header: 1,
					blankrows: false,
				}) as (string | number | null)[][];

				const combined = [...base];
				for (const name of rest) {
					const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
						header: 1,
						blankrows: false,
					}) as (string | number | null)[][];
					combined.push(...rows.slice(1));
				}

				workbook.Sheets[combinedSheetName] = XLSX.utils.aoa_to_sheet(combined);
				workbook.SheetNames.push(combinedSheetName);
			} else {
				const sheetsData = sourceSheets.map(
					(name) =>
						XLSX.utils.sheet_to_json(workbook.Sheets[name], {
							defval: '',
						}) as Record<string, any>[],
				);

				const headerSet = new Set<string>();
				sheetsData.forEach((rows) => {
					rows.forEach((row) =>
						Object.keys(row).forEach((h) => headerSet.add(h)),
					);
				});
				const headers = Array.from(headerSet);

				const aoa: any[][] = [headers];
				sheetsData.forEach((rows) => {
					rows.forEach((row) => {
						aoa.push(headers.map((h) => row[h] ?? null));
					});
				});

				workbook.Sheets[combinedSheetName] = XLSX.utils.aoa_to_sheet(aoa);
				workbook.SheetNames.push(combinedSheetName);
			}

			yield* logger.info(`Created combined worksheet "${combinedSheetName}"`);

			return {
				...state,
				selectedSheet: combinedSheetName,
				history: [...state.history, combinedSheetName],
				metadata: {
					...state.metadata,
					sheetsProcessed: state.metadata.sheetsProcessed + sourceSheets.length,
				},
			};
		} catch (error) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'COMBINE_WORKSHEETS',
					reason:
						error instanceof Error
							? error.message
							: 'Failed to combine worksheets',
				}),
			);
		}
	});
}

function generateSheetName(workbook: XLSX.WorkBook, base: string): string {
	let name = base;
	let counter = 1;
	while (workbook.SheetNames.includes(name)) {
		name = `${base}_${counter}`;
		counter++;
	}
	return name;
}
