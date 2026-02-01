import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { ReplaceCharactersRule } from '../types.js';

export function applyReplaceCharacters(state: TransformationState, rule: ReplaceCharactersRule) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;
		const { workbook, selectedSheet } = state;
		const params = rule.params;

		const sheetName = selectedSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'REPLACE_CHARACTERS',
					reason: `Worksheet "${sheetName}" not found`,
				}),
			);
		}

		yield* logger.info(`Replacing characters`, {
			search: params.search,
			replace: params.replace,
			columns: params.columns || 'all',
			sheetName,
		});

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
			let replacementCount = 0;

			const shouldProcessColumn = (colIndex: number): boolean => {
				if (!params.columns || params.columns.length === 0) {
					return true;
				}
				const colLetter = XLSX.utils.encode_col(colIndex);
				return params.columns.includes(colLetter);
			};

			for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
				for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
					if (!shouldProcessColumn(colIndex)) continue;

					const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
					const cell = worksheet[cellAddr];

					if (cell && cell.v) {
						const originalValue = String(cell.v);
						const newValue = originalValue.replaceAll(params.search, params.replace);

						if (originalValue !== newValue) {
							cell.v = newValue;
							if (cell.t === 's' || cell.t === 'str') {
								cell.w = newValue;
							}
							replacementCount++;
						}
					}
				}
			}

			yield* logger.info(`Replaced characters in ${replacementCount} cells`);

			return state;
		} catch (error) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'REPLACE_CHARACTERS',
					reason: error instanceof Error ? error.message : 'Failed to replace characters',
				}),
			);
		}
	});
}
