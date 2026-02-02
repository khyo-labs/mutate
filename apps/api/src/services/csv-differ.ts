import type { ParsedCsv } from './csv-parser.js';

export type CsvDiff = {
	removedColumns: string[];
	addedColumns: string[];
	columnCountChange: { input: number; output: number };
	rowCountChange: { input: number; output: number };
	removedRowIndices: number[];
	characterReplacements: Array<{
		column: string;
		examples: Array<{ from: string; to: string }>;
	}>;
};

export function computeDiff(input: ParsedCsv, output: ParsedCsv): CsvDiff {
	const removedColumns = input.headers.filter((h) => !output.headers.includes(h));
	const addedColumns = output.headers.filter((h) => !input.headers.includes(h));

	const removedRowIndices = findRemovedRows(input, output);
	const characterReplacements = findCharacterReplacements(input, output);

	return {
		removedColumns,
		addedColumns,
		columnCountChange: { input: input.totalColumns, output: output.totalColumns },
		rowCountChange: { input: input.totalRows, output: output.totalRows },
		removedRowIndices,
		characterReplacements,
	};
}

function findRemovedRows(input: ParsedCsv, output: ParsedCsv): number[] {
	const outputRowSet = new Set(output.rows.map((row) => row.join('|')));
	const removed: number[] = [];

	for (let i = 0; i < input.rows.length; i++) {
		const key = input.rows[i].join('|');
		if (!outputRowSet.has(key)) {
			removed.push(i + 1);
		}
	}

	return removed;
}

function findCharacterReplacements(
	input: ParsedCsv,
	output: ParsedCsv,
): CsvDiff['characterReplacements'] {
	const alignedColumns = input.headers.filter((h) => output.headers.includes(h));
	const replacements: CsvDiff['characterReplacements'] = [];

	for (const col of alignedColumns) {
		const inputColIdx = input.headers.indexOf(col);
		const outputColIdx = output.headers.indexOf(col);
		const examples: Array<{ from: string; to: string }> = [];

		const maxRows = Math.min(input.rows.length, output.rows.length);
		for (let i = 0; i < maxRows; i++) {
			const inputVal = input.rows[i][inputColIdx] ?? '';
			const outputVal = output.rows[i][outputColIdx] ?? '';

			if (inputVal !== outputVal && inputVal.length > 0 && outputVal.length > 0) {
				examples.push({ from: inputVal, to: outputVal });
				if (examples.length >= 3) break;
			}
		}

		if (examples.length > 0) {
			replacements.push({ column: col, examples });
		}
	}

	return replacements;
}
