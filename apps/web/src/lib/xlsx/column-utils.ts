import * as XLSX from 'xlsx';

export function parseColumnIdentifier(
	identifier: string,
	headers: string[],
): number {
	const asNumber = Number(identifier);
	if (!isNaN(asNumber) && Number.isInteger(asNumber)) return asNumber;

	const headerIndex = headers.findIndex(
		(h) => h?.toLowerCase() === identifier.toLowerCase(),
	);
	if (headerIndex !== -1) return headerIndex;

	if (/^[A-Z]+$/i.test(identifier))
		return XLSX.utils.decode_col(identifier.toUpperCase());

	throw new Error(`Invalid column identifier: ${identifier}`);
}

export function getColumnLabel(index: number): string {
	return XLSX.utils.encode_col(index);
}
