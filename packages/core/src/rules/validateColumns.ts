import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import { ValidationError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { ValidateColumnsRule } from '../types.js';

export function applyValidateColumns(state: TransformationState, rule: ValidateColumnsRule) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;
		const { workbook, selectedSheet } = state;
		const params = rule.params;

		const sheetName = selectedSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			return yield* Effect.fail(
				new ValidationError({
					field: 'worksheet',
					message: `Worksheet "${sheetName}" not found`,
				}),
			);
		}

		const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
		const actualColumns = range.e.c + 1;

		yield* logger.info(`Validating columns`, {
			expected: params.numOfColumns,
			actual: actualColumns,
			sheetName,
		});

		if (actualColumns !== params.numOfColumns) {
			const message = `Column count mismatch. Expected ${params.numOfColumns}, found ${actualColumns}`;

			switch (params.onFailure) {
				case 'stop':
					return yield* Effect.fail(
						new ValidationError({
							field: 'columns',
							message,
						}),
					);

				case 'notify':
					yield* logger.warn(message, { sheetName });
					break;

				case 'continue':
					yield* logger.info(`${message} (continuing)`, { sheetName });
					break;
			}
		}

		return state;
	});
}
