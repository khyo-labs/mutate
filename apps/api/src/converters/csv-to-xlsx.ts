import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import type { Configuration } from '@/types/index.js';

import type { Converter } from './core/types.js';

function detectDelimiter(csvText: string): string {
	const delimiters = [',', ';', '\t', '|'];
	const firstLine = csvText.split('\n')[0] || '';

	let maxCount = 0;
	let detectedDelimiter = ',';

	for (const delimiter of delimiters) {
		const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
		if (count > maxCount) {
			maxCount = count;
			detectedDelimiter = delimiter;
		}
	}

	return detectedDelimiter;
}

export const csvToXlsxConverter: Converter = {
	supports: (input: string, output: string) => input === 'csv' && output === 'xlsx',

	convert: (file: Buffer, config?: Configuration) =>
		Effect.tryPromise({
			try: async () => {
				const csvText = file.toString('utf-8');
				const delimiter = detectDelimiter(csvText);

				const rows = csvText
					.trim()
					.split('\n')
					.map((line) => line.split(delimiter).map((cell) => cell.trim()));

				const workbook = XLSX.utils.book_new();
				const worksheet = XLSX.utils.aoa_to_sheet(rows);
				XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

				const xlsxBuffer = XLSX.write(workbook, {
					type: 'buffer',
					bookType: 'xlsx',
				});

				return Buffer.from(xlsxBuffer);
			},
			catch: (error) => new Error(`CSV to XLSX conversion failed: ${String(error)}`),
		}),

	metadata: {
		description: 'Converts a CSV into a single-sheet Excel workbook.',
		status: 'supported',
		experimental: false,
		costEstimate: null,
		notes: 'Auto-detects delimiters.',
	},
};
