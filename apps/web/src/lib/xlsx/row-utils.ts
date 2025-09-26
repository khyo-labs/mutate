import { parseColumnIdentifier } from './column-utils';

export function shouldDeleteRow(
	row: (string | number | null)[],
	condition: unknown,
	headers: string[],
): boolean {
	if (!condition) return false;
	const cond = condition as { type: string; column?: string; value?: string };

	switch (cond.type) {
		case 'empty': {
			if (cond.column?.trim()) {
				const colIndex = parseColumnIdentifier(cond.column, headers);
				if (colIndex === -1) return false;
				const val = row[colIndex];
				return !val || val.toString().trim() === '';
			}
			return row.every((val) => !val || val.toString().trim() === '');
		}
		case 'contains': {
			if (cond.column?.trim()) {
				const colIndex = parseColumnIdentifier(cond.column, headers);
				if (colIndex === -1) return false;
				return row[colIndex]?.toString().includes(cond.value || '') ?? false;
			}
			return row.some((val) => val?.toString().includes(cond.value || ''));
		}
		case 'pattern': {
			const regex = new RegExp(cond.value || '', 'i');
			if (cond.column?.trim()) {
				const colIndex = parseColumnIdentifier(cond.column, headers);
				if (colIndex === -1) return false;
				return regex.test(row[colIndex]?.toString() || '');
			}
			return row.some((val) => regex.test(val?.toString() || ''));
		}
		default:
			return false;
	}
}
