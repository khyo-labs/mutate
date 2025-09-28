import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { DeleteColumnsRule } from '../types.js';

export function applyDeleteColumns(
	state: TransformationState,
	rule: DeleteColumnsRule,
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
					rule: 'DELETE_COLUMNS',
					reason: `Worksheet "${sheetName}" not found`,
				}),
			);
		}

		if (!params.columns || params.columns.length === 0) {
			yield* logger.info('No columns specified for deletion, skipping');
			return state;
		}

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

			const parseCol = (identifier: string): number | null => {
				const trimmed = String(identifier).trim();
				if (/^[A-Za-z]+$/.test(trimmed)) {
					return XLSX.utils.decode_col(trimmed);
				}
				const asNum = Number.parseInt(trimmed, 10);
				if (!Number.isNaN(asNum)) {
					return Math.max(0, asNum - 1);
				}
				return null;
			};

			const deleteSet = new Set<number>();
			for (const col of params.columns) {
				const idx = parseCol(col);
				if (idx !== null) deleteSet.add(idx);
			}

			if (deleteSet.size === 0) {
				yield* logger.info('No valid columns resolved, skipping');
				return state;
			}

			const toDelete = Array.from(deleteSet)
				.filter((c) => c >= range.s.c && c <= range.e.c)
				.sort((a, b) => a - b);

			if (toDelete.length === 0) {
				yield* logger.info(
					'Specified columns are outside current range, skipping',
				);
				return state;
			}

			const countDeletedBefore = (c: number) =>
				toDelete.filter((d) => d < c).length;

			const newSheet: XLSX.WorkSheet = {} as any;
			const props = ['!merges', '!cols', '!rows', '!protect', '!autofilter'];
			for (const p of props) {
				if ((worksheet as any)[p] !== undefined) {
					(newSheet as any)[p] = (worksheet as any)[p];
				}
			}

			Object.keys(worksheet)
				.filter((k) => !k.startsWith('!'))
				.forEach((addr) => {
					const { c, r } = XLSX.utils.decode_cell(addr);
					if (toDelete.includes(c)) return;
					const shift = countDeletedBefore(c);
					const newAddr = XLSX.utils.encode_cell({ c: c - shift, r });
					(newSheet as any)[newAddr] = (worksheet as any)[addr];
				});

			const newEndC = range.e.c - toDelete.length;
			if (newEndC >= range.s.c) {
				newSheet['!ref'] = XLSX.utils.encode_range({
					s: range.s,
					e: { c: newEndC, r: range.e.r },
				});
			} else {
				newSheet['!ref'] = 'A1:A1';
			}

			workbook.Sheets[sheetName] = newSheet;

			yield* logger.info(
				`Deleted ${toDelete.length} column(s) from "${sheetName}"`,
			);

			return {
				...state,
				metadata: {
					...state.metadata,
					columnsProcessed: state.metadata.columnsProcessed + toDelete.length,
				},
			};
		} catch (error) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'DELETE_COLUMNS',
					reason:
						error instanceof Error ? error.message : 'Failed to delete columns',
				}),
			);
		}
	});
}
