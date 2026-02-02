import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type ParsedCsv = {
	headers: string[];
	rows: string[][];
	totalRows: number;
	totalColumns: number;
};

const MAX_ROWS_FOR_AI = 50;

export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
	const records: string[][] = parse(buffer, {
		relax_column_count: true,
		skip_empty_lines: false,
		trim: true,
	});

	if (records.length === 0) {
		return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };
	}

	const headers = records[0];
	const allRows = records.slice(1);
	const rows = allRows.slice(0, MAX_ROWS_FOR_AI);

	return {
		headers,
		rows,
		totalRows: allRows.length,
		totalColumns: headers.length,
	};
}

export function parseXlsxBuffer(buffer: Buffer): ParsedCsv {
	const workbook = XLSX.read(buffer, {
		type: 'buffer',
		cellDates: true,
		cellText: false,
	});

	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };
	}

	const worksheet = workbook.Sheets[sheetName];
	const records: string[][] = XLSX.utils.sheet_to_json(worksheet, {
		header: 1,
		defval: '',
		raw: false,
		blankrows: false,
	});

	if (records.length === 0) {
		return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };
	}

	const headers = records[0].map(String);
	const allRows = records.slice(1).map((row) => row.map(String));
	const rows = allRows.slice(0, MAX_ROWS_FOR_AI);

	return {
		headers,
		rows,
		totalRows: allRows.length,
		totalColumns: headers.length,
	};
}
