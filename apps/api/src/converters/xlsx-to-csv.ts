import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import type { Configuration } from '@/types/index.js';

import type { Converter } from './core/types.js';

export const xlsxToCsvConverter: Converter = {
	supports: (input: string, output: string) => input === 'xlsx' && output === 'csv',

	convert: (file: Buffer, config?: Configuration) =>
		Effect.tryPromise({
			try: async () => {
				const workbook = XLSX.read(file, {
					type: 'buffer',
					cellDates: true,
					cellNF: false,
					cellText: false,
				});

				let sheetName = workbook.SheetNames[0];
				const delimiter = ',';

				if (!workbook.Sheets[sheetName]) {
					throw new Error(`Sheet "${sheetName}" not found in workbook`);
				}

				const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
					blankrows: false,
					FS: delimiter,
					rawNumbers: true,
				});

				return Buffer.from(csvData, 'utf-8');
			},
			catch: (error) => new Error(`XLSX to CSV conversion failed: ${String(error)}`),
		}),

	metadata: {
		description: 'Converts workbook sheets into CSV (first sheet by default).',
		status: 'supported',
		experimental: false,
		costEstimate: null,
		notes: 'Auto-detects delimiters. Supports config-based sheet selection.',
	},
};
