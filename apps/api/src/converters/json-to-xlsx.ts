import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import type { Configuration } from '@/types/index.js';

import type { Converter } from './core/types.js';

export const jsonToXlsxConverter: Converter = {
	supports: (input: string, output: string) =>
		input === 'json' && output === 'xlsx',

	convert: (file: Buffer, config?: Configuration) =>
		Effect.tryPromise({
			try: async () => {
				const jsonData = JSON.parse(file.toString('utf-8'));

				const workbook = XLSX.utils.book_new();

				if (Array.isArray(jsonData)) {
					const worksheet = XLSX.utils.json_to_sheet(jsonData);
					XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
				} else if (typeof jsonData === 'object' && jsonData !== null) {
					for (const [sheetName, data] of Object.entries(jsonData)) {
						if (Array.isArray(data)) {
							const worksheet = XLSX.utils.json_to_sheet(data);
							XLSX.utils.book_append_sheet(
								workbook,
								worksheet,
								sheetName.slice(0, 31),
							);
						}
					}

					if (workbook.SheetNames.length === 0) {
						const worksheet = XLSX.utils.json_to_sheet([jsonData]);
						XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
					}
				} else {
					throw new Error('JSON must be an array or object');
				}

				const xlsxBuffer = XLSX.write(workbook, {
					type: 'buffer',
					bookType: 'xlsx',
				});

				return Buffer.from(xlsxBuffer);
			},
			catch: (error) =>
				new Error(`JSON to XLSX conversion failed: ${String(error)}`),
		}),

	metadata: {
		description:
			'Converts a JSON array or object into a single-sheet workbook.',
		status: 'supported',
		experimental: false,
		costEstimate: null,
		notes: 'Infers headers from keys.',
	},
};
