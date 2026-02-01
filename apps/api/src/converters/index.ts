import type { Converter, ConverterFormat } from './core/types.js';
import { csvToJsonConverter } from './csv-to-json.js';
import { csvToXlsxConverter } from './csv-to-xlsx.js';
import { jsonToCsvConverter } from './json-to-csv.js';
import { jsonToXlsxConverter } from './json-to-xlsx.js';
import { xlsxToCsvConverter } from './xlsx-to-csv.js';
import { xlsxToJsonConverter } from './xlsx-to-json.js';

export const converters: Converter[] = [
	xlsxToJsonConverter,
	jsonToXlsxConverter,
	csvToJsonConverter,
	xlsxToCsvConverter,
	jsonToCsvConverter,
	csvToXlsxConverter,
];

export function findConverter(inputType: string, outputType: string): Converter | null {
	const input = inputType.toLowerCase();
	const output = outputType.toLowerCase();

	return converters.find((converter) => converter.supports(input, output)) || null;
}

export function listFormats(): ConverterFormat[] {
	const formats: ConverterFormat[] = [];
	const types = ['xlsx', 'json', 'csv'];

	for (const converter of converters) {
		if (!converter.metadata) continue;

		for (const from of types) {
			for (const to of types) {
				if (converter.supports(from, to)) {
					formats.push({
						from,
						to,
						description: converter.metadata.description,
						status: converter.metadata.status,
						experimental: converter.metadata.experimental,
						costEstimate: converter.metadata.costEstimate,
						notes: converter.metadata.notes,
					});
				}
			}
		}
	}

	return formats;
}

export * from './core/types.js';
export * from './core/pipeline.js';
