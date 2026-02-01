import * as XLSX from 'xlsx';

export function worksheetToMatrix(ws: XLSX.WorkSheet): (string | number | null)[][] {
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
	const data: (string | number | null)[][] = [];

	for (let r = range.s.r; r <= range.e.r; r++) {
		const row: (string | number | null)[] = [];
		for (let c = range.s.c; c <= range.e.c; c++) {
			const addr = XLSX.utils.encode_cell({ r, c });
			const cell = ws[addr];
			row.push(cell ? (cell.v ?? null) : null);
		}
		data.push(row);
	}
	return data;
}

export function extractHeaders(data: (string | number | null)[][]): string[] {
	return data.length > 0 ? data[0].map((cell, idx) => cell?.toString() || `Column ${idx + 1}`) : [];
}
