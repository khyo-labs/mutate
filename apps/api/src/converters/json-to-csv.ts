import { Effect } from 'effect';

import type { Configuration } from '@/types/index.js';

import type { Converter } from './core/types.js';

function flattenObject(obj: any, prefix = ''): any {
	const flattened: any = {};

	for (const key in obj) {
		const value = obj[key];
		const newKey = prefix ? `${prefix}.${key}` : key;

		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			Object.assign(flattened, flattenObject(value, newKey));
		} else {
			flattened[newKey] = value;
		}
	}

	return flattened;
}

function jsonToCsv(data: any[], delimiter = ','): string {
	if (data.length === 0) return '';

	const flattenedData = data.map((item) => flattenObject(item));

	const headers = Array.from(new Set(flattenedData.flatMap((item) => Object.keys(item))));

	const csvRows = [headers.join(delimiter)];

	for (const item of flattenedData) {
		const values = headers.map((header) => {
			const value = item[header];
			if (value === null || value === undefined) return '';
			const stringValue = String(value);
			return stringValue.includes(delimiter) || stringValue.includes('\n')
				? `"${stringValue.replace(/"/g, '""')}"`
				: stringValue;
		});
		csvRows.push(values.join(delimiter));
	}

	return csvRows.join('\n');
}

export const jsonToCsvConverter: Converter = {
	supports: (input: string, output: string) => input === 'json' && output === 'csv',

	convert: (file: Buffer, config?: Configuration) =>
		Effect.tryPromise({
			try: async () => {
				const jsonData = JSON.parse(file.toString('utf-8'));

				if (!Array.isArray(jsonData)) {
					throw new Error('JSON must be an array of objects for CSV conversion');
				}

				const csvData = jsonToCsv(jsonData, ',');

				return Buffer.from(csvData, 'utf-8');
			},
			catch: (error) => new Error(`JSON to CSV conversion failed: ${String(error)}`),
		}),

	metadata: {
		description: 'Converts JSON array to CSV string.',
		status: 'supported',
		experimental: false,
		costEstimate: null,
		notes: 'Flattens nested objects automatically.',
	},
};
