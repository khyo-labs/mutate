import { Effect } from 'effect';
import * as XLSX from 'xlsx';

import type { Configuration } from '@/types/index.js';

import type { Converter } from './core/types.js';

export const xlsxToJsonConverter: Converter = {
	supports: (input: string, output: string) =>
		input === 'xlsx' && output === 'json',

	convert: (file: Buffer, config?: Configuration) =>
		Effect.tryPromise({
			try: async () => {
				const workbook = XLSX.read(file, {
					type: 'buffer',
					cellDates: true,
					cellNF: false,
					cellText: false,
				});

				const result: Record<string, any[]> = {};

				workbook.SheetNames.forEach((sheetName) => {
					const worksheet = workbook.Sheets[sheetName];
					const jsonData = XLSX.utils.sheet_to_json(worksheet, {
						defval: '',
						raw: false,
					});
					result[sheetName] = jsonData;
				});

				return result;
			},
			catch: (error) =>
				new Error(`XLSX to JSON conversion failed: ${String(error)}`),
		}),

	metadata: {
		description:
			'Converts each sheet in the workbook to JSON. Returns { SheetName: [...rows] }.',
		status: 'supported',
		experimental: false,
		costEstimate: null,
		notes: 'Handles multiple sheets automatically.',
	},
};
