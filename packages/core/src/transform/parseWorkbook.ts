import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { ParseError } from '../errors.js';
import { LoggerService } from '../services/logger.js';

export function parseWorkbook(buffer: Buffer, fileName: string = 'file') {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;

		yield* logger.info(`Parsing workbook: ${fileName}`, {
			size: buffer.length,
		});

		try {
			const workbook = XLSX.read(buffer, {
				type: 'buffer',
				cellDates: true,
				cellNF: false,
				cellText: false,
			});

			yield* logger.info(`Loaded workbook with sheets`, {
				sheetCount: workbook.SheetNames.length,
				sheetNames: workbook.SheetNames,
			});

			// Log detailed sheet information
			for (const sheetName of workbook.SheetNames) {
				const sheet = workbook.Sheets[sheetName];
				if (sheet['!ref']) {
					const range = XLSX.utils.decode_range(sheet['!ref']);
					yield* logger.debug(`Sheet "${sheetName}" details`, {
						range: sheet['!ref'],
						rows: range.e.r + 1,
						columns: range.e.c + 1,
					});
				}
			}

			return workbook;
		} catch (error) {
			yield* logger.error(`Failed to parse workbook`, error, { fileName });
			return yield* Effect.fail(
				new ParseError({
					fileName,
					message: error instanceof Error ? error.message : 'Unknown parsing error',
				}),
			);
		}
	});
}
