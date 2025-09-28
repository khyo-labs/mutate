import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { UnmergeAndFillRule } from '../types.js';

export function applyUnmergeAndFill(
	state: TransformationState,
	rule: UnmergeAndFillRule,
) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;
		const { workbook, selectedSheet } = state;
		const params = rule.params;

		const sheetName = selectedSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'UNMERGE_AND_FILL',
					reason: `Worksheet "${sheetName}" not found`,
				}),
			);
		}

		yield* logger.info(`Unmerging and filling columns`, {
			columns: params.columns,
			fillDirection: params.fillDirection,
			sheetName,
		});

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

			for (const columnLetter of params.columns) {
				const colIndex = XLSX.utils.decode_col(columnLetter);
				let lastValue = '';

				if (params.fillDirection === 'down') {
					for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
						const cellAddr = XLSX.utils.encode_cell({
							c: colIndex,
							r: rowIndex,
						});
						const cell = worksheet[cellAddr];

						if (cell && cell.v) {
							lastValue = String(cell.v);
						} else if (!cell || !cell.v) {
							if (lastValue) {
								worksheet[cellAddr] = { t: 's', v: lastValue };
							}
						}
					}
				} else if (params.fillDirection === 'up') {
					let nextValue = '';
					for (let rowIndex = range.e.r; rowIndex >= range.s.r; rowIndex--) {
						const cellAddr = XLSX.utils.encode_cell({
							c: colIndex,
							r: rowIndex,
						});
						const cell = worksheet[cellAddr];

						if (cell && cell.v) {
							nextValue = String(cell.v);
						} else if (!cell || !cell.v) {
							if (nextValue) {
								worksheet[cellAddr] = { t: 's', v: nextValue };
							}
						}
					}
				}
			}

			yield* logger.info(
				`Successfully filled ${params.columns.length} columns`,
			);

			return {
				...state,
				metadata: {
					...state.metadata,
					columnsProcessed:
						state.metadata.columnsProcessed + params.columns.length,
				},
			};
		} catch (error) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'UNMERGE_AND_FILL',
					reason:
						error instanceof Error
							? error.message
							: 'Failed to unmerge and fill',
				}),
			);
		}
	});
}
