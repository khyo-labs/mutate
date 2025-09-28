import { Effect } from 'effect';

import { RuleApplicationError } from '../errors.js';
import { applyCombineWorksheets } from '../rules/combineWorksheets.js';
import { applyDeleteColumns } from '../rules/deleteColumns.js';
import { applyDeleteRows } from '../rules/deleteRows.js';
import { applyEvaluateFormulas } from '../rules/evaluateFormulas.js';
import { applyReplaceCharacters } from '../rules/replaceCharacters.js';
import { applySelectWorksheet } from '../rules/selectWorksheet.js';
import { applyUnmergeAndFill } from '../rules/unmergeAndFill.js';
import { applyValidateColumns } from '../rules/validateColumns.js';
import { LoggerService } from '../services/logger.js';
import type { TransformationRule } from '../types.js';
import type { TransformationState } from './types.js';

export function applyRule(
	state: TransformationState,
	rule: TransformationRule,
	ruleIndex: number,
) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;

		yield* logger.info(`Applying rule ${ruleIndex + 1}`, {
			type: rule.type,
			ruleId: rule.id,
		});

		try {
			let result: TransformationState;

			switch (rule.type) {
				case 'SELECT_WORKSHEET':
					result = yield* applySelectWorksheet(state, rule);
					break;

				case 'VALIDATE_COLUMNS':
					result = yield* applyValidateColumns(state, rule);
					break;

				case 'UNMERGE_AND_FILL':
					result = yield* applyUnmergeAndFill(state, rule);
					break;

				case 'DELETE_ROWS':
					result = yield* applyDeleteRows(state, rule);
					break;

				case 'DELETE_COLUMNS':
					result = yield* applyDeleteColumns(state, rule);
					break;

				case 'COMBINE_WORKSHEETS':
					result = yield* applyCombineWorksheets(state, rule);
					break;

				case 'EVALUATE_FORMULAS':
					result = yield* applyEvaluateFormulas(state, rule);
					break;

				case 'REPLACE_CHARACTERS':
					result = yield* applyReplaceCharacters(state, rule);
					break;

				default:
					const exhaustiveCheck: never = rule;
					return yield* Effect.fail(
						new RuleApplicationError({
							ruleType: (exhaustiveCheck as any).type,
							ruleIndex,
							message: `Unknown rule type`,
						}),
					);
			}

			yield* logger.info(`Rule completed successfully`, {
				type: rule.type,
				ruleIndex,
			});

			return result;
		} catch (error) {
			yield* logger.error(`Rule application failed`, error, {
				type: rule.type,
				ruleIndex,
			});

			return yield* Effect.fail(
				new RuleApplicationError({
					ruleType: rule.type,
					ruleIndex,
					message:
						error instanceof Error ? error.message : 'Rule application failed',
				}),
			);
		}
	});
}
