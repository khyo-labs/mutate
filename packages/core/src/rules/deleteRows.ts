import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { DeleteRowsRule } from '../types.js';

export function applyDeleteRows(
	state: TransformationState,
	rule: DeleteRowsRule,
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
					rule: 'DELETE_ROWS',
					reason: `Worksheet "${sheetName}" not found`,
				}),
			);
		}

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
			const rowsToDelete: number[] = [];

			if (params.method === 'rows' && params.rows) {
				yield* logger.info(`Deleting specific rows`, {
					rows: params.rows,
					sheetName,
				});
				rowsToDelete.push(...params.rows.map((row) => row - 1));
			} else if (params.method === 'condition' && params.condition) {
				yield* logger.info(`Deleting rows by condition`, {
					condition: params.condition,
					sheetName,
				});

				for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
					let shouldDelete = false;

					if (params.condition.type === 'empty') {
						if (params.condition.column) {
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							shouldDelete = !cell || !cell.v || String(cell.v).trim() === '';
						} else {
							let hasContent = false;
							for (
								let colIndex = range.s.c;
								colIndex <= range.e.c;
								colIndex++
							) {
								const cellAddr = XLSX.utils.encode_cell({
									c: colIndex,
									r: rowIndex,
								});
								const cell = worksheet[cellAddr];
								if (cell && cell.v && String(cell.v).trim() !== '') {
									hasContent = true;
									break;
								}
							}
							shouldDelete = !hasContent;
						}
					} else if (
						params.condition.type === 'contains' &&
						params.condition.value
					) {
						if (params.condition.column) {
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							const cellValue = cell && cell.v ? String(cell.v) : '';
							shouldDelete = cellValue
								.toLowerCase()
								.includes(params.condition.value.toLowerCase());
						} else {
							for (
								let colIndex = range.s.c;
								colIndex <= range.e.c;
								colIndex++
							) {
								const cellAddr = XLSX.utils.encode_cell({
									c: colIndex,
									r: rowIndex,
								});
								const cell = worksheet[cellAddr];
								const cellValue = cell && cell.v ? String(cell.v) : '';
								if (
									cellValue
										.toLowerCase()
										.includes(params.condition.value.toLowerCase())
								) {
									shouldDelete = true;
									break;
								}
							}
						}
					} else if (
						params.condition.type === 'pattern' &&
						params.condition.value
					) {
						const regex = new RegExp(params.condition.value, 'i');
						if (params.condition.column) {
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							const cellValue = cell && cell.v ? String(cell.v) : '';
							shouldDelete = regex.test(cellValue);
						} else {
							for (
								let colIndex = range.s.c;
								colIndex <= range.e.c;
								colIndex++
							) {
								const cellAddr = XLSX.utils.encode_cell({
									c: colIndex,
									r: rowIndex,
								});
								const cell = worksheet[cellAddr];
								const cellValue = cell && cell.v ? String(cell.v) : '';
								if (regex.test(cellValue)) {
									shouldDelete = true;
									break;
								}
							}
						}
					}

					if (shouldDelete) {
						rowsToDelete.push(rowIndex);
					}
				}
			}

			rowsToDelete.sort((a, b) => b - a);

			yield* logger.info(`Found ${rowsToDelete.length} rows to delete`);

			for (const rowIndex of rowsToDelete) {
				for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
					const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
					delete worksheet[cellAddr];
				}

				for (let r = rowIndex + 1; r <= range.e.r; r++) {
					for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
						const oldAddr = XLSX.utils.encode_cell({ c: colIndex, r: r });
						const newAddr = XLSX.utils.encode_cell({ c: colIndex, r: r - 1 });

						if (worksheet[oldAddr]) {
							worksheet[newAddr] = worksheet[oldAddr];
							delete worksheet[oldAddr];
						}
					}
				}

				range.e.r--;
			}

			if (range.e.r >= range.s.r) {
				worksheet['!ref'] = XLSX.utils.encode_range(range);
			} else {
				worksheet['!ref'] = 'A1:A1';
			}

			yield* logger.info(`Successfully deleted ${rowsToDelete.length} rows`);

			return {
				...state,
				metadata: {
					...state.metadata,
					rowsProcessed: state.metadata.rowsProcessed + rowsToDelete.length,
				},
			};
		} catch (error) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'DELETE_ROWS',
					reason:
						error instanceof Error ? error.message : 'Failed to delete rows',
				}),
			);
		}
	});
}
