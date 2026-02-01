import { Effect } from 'effect';

import { WorksheetNotFoundError } from '../errors.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { SelectWorksheetRule } from '../types.js';

export function applySelectWorksheet(state: TransformationState, rule: SelectWorksheetRule) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;
		const { workbook } = state;
		const params = rule.params;

		let targetSheet: string | null = null;

		switch (params.type) {
			case 'name':
				if (workbook.SheetNames.includes(params.value)) {
					targetSheet = params.value;
				}
				break;

			case 'index':
				const index = parseInt(params.value);
				if (index >= 0 && index < workbook.SheetNames.length) {
					targetSheet = workbook.SheetNames[index];
				}
				break;

			case 'pattern':
				const regex = new RegExp(params.value, 'i');
				targetSheet = workbook.SheetNames.find((name) => regex.test(name)) || null;
				break;
		}

		if (!targetSheet) {
			yield* logger.warn(
				`No worksheet found matching ${params.type}: "${params.value}". Falling back to first sheet.`,
				{
					availableSheets: workbook.SheetNames,
				},
			);
			targetSheet = workbook.SheetNames[0];

			if (!targetSheet) {
				return yield* Effect.fail(
					new WorksheetNotFoundError({
						sheetName: params.value,
						availableSheets: workbook.SheetNames,
					}),
				);
			}
		}

		yield* logger.info(`Selected worksheet: "${targetSheet}"`);

		return {
			...state,
			selectedSheet: targetSheet,
			history: [...state.history, targetSheet],
			metadata: {
				...state.metadata,
				sheetsProcessed: state.metadata.sheetsProcessed + 1,
			},
		};
	});
}
