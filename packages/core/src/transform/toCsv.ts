import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError, WorksheetNotFoundError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { OutputFormatConfig } from '../types.js';

export function toCsv(
	workbook: XLSX.WorkBook,
	selectedSheet: string | null,
	outputFormat: OutputFormatConfig,
) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;

		const sheetName = selectedSheet || workbook.SheetNames[0];

		if (!sheetName) {
			return yield* Effect.fail(
				new TransformError({
					rule: 'toCsv',
					reason: 'No worksheet available to convert',
				}),
			);
		}

		const worksheet = workbook.Sheets[sheetName];
		if (!worksheet) {
			return yield* Effect.fail(
				new WorksheetNotFoundError({
					sheetName,
					availableSheets: workbook.SheetNames,
				}),
			);
		}

		yield* logger.info(`Converting sheet "${sheetName}" to CSV`);

		try {
			const csvData = XLSX.utils.sheet_to_csv(worksheet, {
				blankrows: false,
				FS: outputFormat.type === 'CSV' ? outputFormat.delimiter || ',' : ',',
			});

			yield* logger.info(`CSV conversion completed`, {
				sheetName,
				outputSize: csvData.length,
			});

			return csvData;
		} catch (error) {
			yield* logger.error(`Failed to convert to CSV`, error, { sheetName });
			return yield* Effect.fail(
				new TransformError({
					rule: 'toCsv',
					reason: error instanceof Error ? error.message : 'CSV conversion failed',
				}),
			);
		}
	});
}
