import { Effect } from 'effect';

import { LoggerService } from '../services/logger.js';
import type { TransformationState } from '../transform/types.js';
import type { EvaluateFormulasRule } from '../types.js';

export function applyEvaluateFormulas(state: TransformationState, rule: EvaluateFormulasRule) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;
		const params = rule.params;

		if (params.enabled) {
			yield* logger.info('Formula evaluation enabled (handled by XLSX.js)');
		} else {
			yield* logger.info('Formula evaluation disabled');
		}

		return state;
	});
}
