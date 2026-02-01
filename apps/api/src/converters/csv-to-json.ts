import { Effect } from 'effect';

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

function parseCsvToJson(csvText: string, delimiter: string): any[] {
	const lines = csvText.trim().split('\n');
	if (lines.length === 0) return [];

	const headers = lines[0].split(delimiter).map((h) => h.trim());
	const result: any[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line.trim()) continue;

		const values = line.split(delimiter).map((v) => v.trim());
		const row: any = {};

		headers.forEach((header, index) => {
			row[header] = values[index] || '';
		});

		result.push(row);
	}

	return result;
}

export const csvToJsonConverter: Converter = {
	supports: (input: string, output: string) => input === 'csv' && output === 'json',

	convert: (file: Buffer, config?: Configuration) =>
		Effect.tryPromise({
			try: async () => {
				const csvText = file.toString('utf-8');
				const delimiter = detectDelimiter(csvText);
				const jsonData = parseCsvToJson(csvText, delimiter);

				return jsonData;
			},
			catch: (error) => new Error(`CSV to JSON conversion failed: ${String(error)}`),
		}),

	metadata: {
		description: 'Converts CSV rows to JSON array.',
		status: 'supported',
		experimental: false,
		costEstimate: null,
		notes: 'Uses auto-detection for delimiters.',
	},
};
