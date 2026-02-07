import {
	Calculator,
	CheckCircle,
	Columns,
	Combine,
	FileText,
	Merge,
	Replace,
	Trash2,
} from 'lucide-react';
import type React from 'react';

import type { TransformationRule, XlsxToCsvRuleType } from '../types';

export const ruleIcons: Record<XlsxToCsvRuleType, React.ComponentType<{ className?: string }>> = {
	SELECT_WORKSHEET: FileText,
	VALIDATE_COLUMNS: CheckCircle,
	UNMERGE_AND_FILL: Merge,
	DELETE_ROWS: Trash2,
	DELETE_COLUMNS: Columns,
	COMBINE_WORKSHEETS: Combine,
	EVALUATE_FORMULAS: Calculator,
	REPLACE_CHARACTERS: Replace,
};

export const ruleDescriptions: Record<XlsxToCsvRuleType, string> = {
	SELECT_WORKSHEET: 'Choose which worksheet to process',
	VALIDATE_COLUMNS: 'Check column count matches expected',
	UNMERGE_AND_FILL: 'Unmerge cells and fill empty cells',
	DELETE_ROWS: 'Remove rows by condition',
	DELETE_COLUMNS: 'Remove specific columns',
	COMBINE_WORKSHEETS: 'Merge multiple sheets together',
	EVALUATE_FORMULAS: 'Calculate formula values',
	REPLACE_CHARACTERS: 'Replace specific characters in cell values',
};

export function formatRuleParams(rule: TransformationRule): string {
	switch (rule.type) {
		case 'SELECT_WORKSHEET': {
			const typeLabel = rule.params.type === 'index' ? 'index' : rule.params.type;
			if (rule.params.value) {
				return `Worksheet: ${rule.params.value} (by ${typeLabel})`;
			}
			return `Select by ${typeLabel}`;
		}

		case 'VALIDATE_COLUMNS': {
			const count = rule.params.numOfColumns;
			const action =
				rule.params.onFailure === 'stop'
					? 'stop on failure'
					: rule.params.onFailure === 'notify'
						? 'notify on failure'
						: 'continue on failure';
			return count ? `Expect ${count} columns, ${action}` : `Validate column count, ${action}`;
		}

		case 'UNMERGE_AND_FILL': {
			const dir = rule.params.fillDirection === 'up' ? 'up' : 'down';
			const cols = rule.params.columns;
			if (cols && cols.length > 0) {
				return `Unmerge and fill ${dir}: ${cols.join(', ')}`;
			}
			return `Unmerge and fill ${dir}`;
		}

		case 'DELETE_ROWS': {
			if (rule.params.method === 'rows' && rule.params.rows && rule.params.rows.length > 0) {
				return `Delete rows: ${rule.params.rows.join(', ')}`;
			}
			if (rule.params.method === 'condition' && rule.params.condition) {
				const cond = rule.params.condition;
				const col = cond.column ? `column ${cond.column}` : 'all columns';
				if (cond.type === 'empty') {
					return `Delete rows where ${col} is empty`;
				}
				if (cond.type === 'contains' && cond.value) {
					return `Delete rows where ${col} contains "${cond.value}"`;
				}
				if (cond.type === 'pattern' && cond.value) {
					return `Delete rows where ${col} matches /${cond.value}/`;
				}
				return `Delete rows by ${cond.type} condition`;
			}
			return 'Delete rows by condition';
		}

		case 'DELETE_COLUMNS': {
			const cols = rule.params.columns;
			if (cols && cols.length > 0) {
				return `Delete columns: ${cols.join(', ')}`;
			}
			return 'Delete columns';
		}

		case 'COMBINE_WORKSHEETS': {
			const op = rule.params.operation === 'merge' ? 'Merge' : 'Append';
			const sheets = rule.params.sourceSheets;
			if (sheets && sheets.length > 0) {
				return `${op} sheets: ${sheets.join(', ')}`;
			}
			return `${op} previously selected worksheets`;
		}

		case 'EVALUATE_FORMULAS': {
			return rule.params.enabled ? 'Evaluate formulas: enabled' : 'Evaluate formulas: disabled';
		}

		case 'REPLACE_CHARACTERS': {
			const reps = rule.params.replacements;
			if (reps.length === 1 && reps[0].find) {
				const r = reps[0];
				return `Replace "${r.find}" with "${r.replace}"`;
			}
			if (reps.length > 1) {
				return `${reps.length} character replacements`;
			}
			return 'Replace characters';
		}

		default:
			return '';
	}
}
