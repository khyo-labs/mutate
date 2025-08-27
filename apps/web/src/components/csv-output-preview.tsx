import { ChevronDown, Download, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

import type { Configuration, TransformationRule } from '../types';
import type { UploadedFile } from './file-upload';

interface CsvOutputPreviewProps {
	file: UploadedFile | null;
	rules: TransformationRule[];
	outputFormat?: Configuration['outputFormat'];
}

interface ProcessedData {
	data: (string | number | null)[][];
	headers: string[];
	rowCount: number;
	colCount: number;
	appliedRules: string[];
	warnings: string[];
}

export function CsvOutputPreview({
	file,
	rules,
	outputFormat = {
		type: 'CSV',
		delimiter: ',',
		encoding: 'UTF-8',
		includeHeaders: true,
	},
}: CsvOutputPreviewProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [showRawCsv, setShowRawCsv] = useState(false);

	const processedData = useMemo<ProcessedData | null>(() => {
		if (!file) return null;

		try {
			return simulateTransformations(file, rules);
		} catch (error) {
			console.error('Error processing transformations:', error);
			return null;
		}
	}, [file, rules]);

	const csvOutput = useMemo(() => {
		if (!processedData) return '';

		const lines: string[] = [];

		// Add headers if enabled
		// if (outputFormat.includeHeaders && processedData.headers.length > 0) {
		// 	lines.push(
		// 		processedData.headers
		// 			.map((h) => escapeCsvValue(h, outputFormat.delimiter))
		// 			.join(outputFormat.delimiter),
		// 	);
		// }

		// Add data rows
		processedData.data.forEach((row) => {
			const csvRow = row
				.map((cell) =>
					escapeCsvValue(cell?.toString() || '', outputFormat.delimiter),
				)
				.join(outputFormat.delimiter);
			lines.push(csvRow);
		});

		return lines.join('\n');
	}, [processedData, outputFormat]);

	function escapeCsvValue(value: string, delimiter: string): string {
		// If value contains delimiter, quotes, or newlines, wrap in quotes and escape internal quotes
		if (
			value.includes(delimiter) ||
			value.includes('"') ||
			value.includes('\n')
		) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	function handleDownload() {
		if (!csvOutput) return;

		const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', 'preview.csv');
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	if (!file) {
		return (
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
				<Download className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-medium text-gray-900">
					No Output Preview
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Upload a file and add transformation rules to see CSV output
				</p>
			</div>
		);
	}

	if (isCollapsed) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white">
				<button
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
				>
					<h3 className="text-lg font-medium text-gray-900">
						CSV Output Preview
					</h3>
					<ChevronDown className="h-5 w-5 text-gray-400" />
				</button>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			{/* Header */}
			<div className="border-b border-gray-200 p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-medium text-gray-900">
							CSV Output Preview
						</h3>
						{processedData && (
							<p className="mt-1 text-sm text-gray-500">
								{processedData.rowCount} rows × {processedData.colCount} columns
								{processedData.appliedRules.length > 0 && (
									<span className="ml-2">
										• {processedData.appliedRules.length} rule
										{processedData.appliedRules.length !== 1 ? 's' : ''} applied
									</span>
								)}
							</p>
						)}
					</div>
					<div className="flex items-center space-x-3">
						<button
							onClick={() => setShowRawCsv(!showRawCsv)}
							className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
								showRawCsv
									? 'bg-blue-100 text-blue-700'
									: 'bg-gray-100 text-gray-600'
							}`}
						>
							{showRawCsv ? (
								<Eye className="mr-1 h-3 w-3" />
							) : (
								<EyeOff className="mr-1 h-3 w-3" />
							)}
							Raw CSV
						</button>
						<button
							onClick={handleDownload}
							disabled={!csvOutput}
							className="inline-flex items-center rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						>
							<Download className="mr-1 h-3 w-3" />
							Download
						</button>
						<button
							onClick={() => setIsCollapsed(true)}
							className="text-gray-400 hover:text-gray-600"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</button>
					</div>
				</div>

				{/* Warnings */}
				{processedData?.warnings && processedData.warnings.length > 0 && (
					<div className="mt-3 rounded-md bg-yellow-50 p-3">
						<h4 className="text-sm font-medium text-yellow-800">Warnings:</h4>
						<ul className="mt-1 text-sm text-yellow-700">
							{processedData.warnings.map((warning, index) => (
								<li key={index}>• {warning}</li>
							))}
						</ul>
					</div>
				)}

				{/* Applied Rules */}
				{processedData?.appliedRules &&
					processedData.appliedRules.length > 0 && (
						<div className="mt-3">
							<h4 className="text-xs font-medium text-gray-700">
								Applied Transformations:
							</h4>
							<div className="mt-1 flex flex-wrap gap-1">
								{processedData.appliedRules.map((rule, index) => (
									<span
										key={index}
										className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
									>
										{rule}
									</span>
								))}
							</div>
						</div>
					)}
			</div>

			{/* Content */}
			<div className="max-h-96 overflow-auto p-4">
				{showRawCsv ? (
					<div className="rounded bg-gray-50 p-3">
						<pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">
							{csvOutput.slice(0, 2000)}
							{csvOutput.length > 2000 && '\n... (truncated)'}
						</pre>
					</div>
				) : (
					processedData && (
						<div className="inline-block min-w-full">
							<table className="border-collapse">
								{/* {outputFormat.includeHeaders &&
									processedData.headers.length > 0 && (
										<thead>
											<tr>
												{processedData.headers.map((header, index) => (
													<th
														key={index}
														className="border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
													>
														{header}
													</th>
												))}
											</tr>
										</thead>
									)} */}
								<tbody>
									{processedData.data.slice(0, 20).map((row, rowIndex) => (
										<tr key={rowIndex}>
											{row.map((cell, colIndex) => (
												<td
													key={colIndex}
													className="border border-gray-200 px-3 py-1 text-xs"
												>
													{cell?.toString() || ''}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
							{processedData.data.length > 20 && (
								<div className="mt-2 text-center text-xs text-gray-500">
									Showing first 20 rows of {processedData.data.length}
								</div>
							)}
						</div>
					)
				)}
			</div>
		</div>
	);
}

function simulateTransformations(
	file: UploadedFile,
	rules: TransformationRule[],
): ProcessedData {
	const appliedRules: string[] = [];
	const warnings: string[] = [];

	// Start with the first worksheet by default
	let activeWorksheet = file.worksheets[0];
	let worksheet = file.workbook.Sheets[activeWorksheet];
	let range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

	// Extract initial data
	let data: (string | number | null)[][] = [];
	for (let row = range.s.r; row <= range.e.r; row++) {
		const rowData: (string | number | null)[] = [];
		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
			const cell = worksheet[cellAddress];
			rowData.push(cell ? (cell.v ?? null) : null);
		}
		data.push(rowData);
	}

	// Extract headers (first row)
	let headers: string[] =
		data.length > 0
			? data[0].map((cell, index) => cell?.toString() || `Column ${index + 1}`)
			: [];

	// Apply transformations in order
	rules.forEach((rule) => {
		switch (rule.type) {
			case 'SELECT_WORKSHEET':
				const targetWorksheet = rule.params.value;
				if (file.worksheets.includes(targetWorksheet)) {
					activeWorksheet = targetWorksheet;
					worksheet = file.workbook.Sheets[activeWorksheet];
					range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

					// Re-extract data from selected worksheet
					data = [];
					for (let row = range.s.r; row <= range.e.r; row++) {
						const rowData: (string | number | null)[] = [];
						for (let col = range.s.c; col <= range.e.c; col++) {
							const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
							const cell = worksheet[cellAddress];
							rowData.push(cell ? (cell.v ?? null) : null);
						}
						data.push(rowData);
					}
					headers =
						data.length > 0
							? data[0].map(
									(cell, index) => cell?.toString() || `Column ${index + 1}`,
								)
							: [];

					appliedRules.push(`Selected worksheet: ${targetWorksheet}`);
				} else {
					warnings.push(`Worksheet "${targetWorksheet}" not found`);
				}
				break;

			case 'VALIDATE_COLUMNS':
				const numOfColumns = rule.params.numOfColumns;
				const actualCount = data.length > 0 ? data[0].length : 0;
				if (actualCount !== numOfColumns) {
					warnings.push(
						`Expected ${numOfColumns} columns, found ${actualCount}`,
					);
					if (rule.params.onFailure === 'stop') {
						return {
							data: [],
							headers: [],
							rowCount: 0,
							colCount: 0,
							appliedRules,
							warnings: [
								...warnings,
								'Processing stopped due to column validation failure',
							],
						};
					}
				}
				appliedRules.push(`Validated ${actualCount} columns`);
				break;

			case 'DELETE_COLUMNS':
				const columnsToDelete = rule.params.columns || [];
				const deleteIndices: number[] = [];

				columnsToDelete.forEach((colIdentifier: string) => {
					const colIndex = parseColumnIdentifier(colIdentifier, headers);
					if (colIndex !== -1 && !deleteIndices.includes(colIndex)) {
						deleteIndices.push(colIndex);
					}
				});

				// Sort indices in descending order to delete from right to left
				deleteIndices.sort((a, b) => b - a);

				deleteIndices.forEach((colIndex) => {
					data = data.map((row) =>
						row.filter((_, index) => index !== colIndex),
					);
					headers = headers.filter((_, index) => index !== colIndex);
				});

				if (deleteIndices.length > 0) {
					appliedRules.push(
						`Deleted ${deleteIndices.length} column${deleteIndices.length !== 1 ? 's' : ''}`,
					);
				}
				break;

			case 'DELETE_ROWS':
				const method = rule.params.method || 'condition';
				const initialRowCount = data.length;

				if (method === 'rows' && rule.params.rows) {
					// Delete specific row numbers (1-based, convert to 0-based)
					const rowsToDelete = rule.params.rows.map((r) => r - 1);
					data = data.filter((_, rowIndex) => !rowsToDelete.includes(rowIndex));

					const deletedCount = initialRowCount - data.length;
					if (deletedCount > 0) {
						appliedRules.push(
							`Deleted ${deletedCount} specific row${deletedCount !== 1 ? 's' : ''}`,
						);
					}
				} else if (method === 'condition' && rule.params.condition) {
					// Delete by condition
					data = data.filter((row, rowIndex) => {
						// Keep header row (index 0) always
						if (rowIndex === 0) return true;

						return !shouldDeleteRow(row, rule.params.condition, headers);
					});

					const deletedCount = initialRowCount - data.length;
					if (deletedCount > 0) {
						appliedRules.push(
							`Deleted ${deletedCount} row${deletedCount !== 1 ? 's' : ''} by condition`,
						);
					}
				}
				break;

			case 'UNMERGE_AND_FILL':
				const fillColumns = rule.params.columns || [];
				const fillDirection = rule.params.fillDirection || 'down';

				fillColumns.forEach((colIdentifier: string) => {
					const colIndex = parseColumnIdentifier(colIdentifier, headers);
					if (colIndex !== -1) {
						data = fillColumn(data, colIndex, fillDirection);
					}
				});

				if (fillColumns.length > 0) {
					appliedRules.push(
						`Filled ${fillColumns.length} column${fillColumns.length !== 1 ? 's' : ''} ${fillDirection}`,
					);
				}
				break;

			case 'EVALUATE_FORMULAS':
				if (rule.params.enabled) {
					// This is a simplified simulation - in reality, you'd evaluate Excel formulas
					appliedRules.push('Evaluated formulas');
				}
				break;

			case 'COMBINE_WORKSHEETS':
				// This would require more complex logic to combine multiple worksheets
				appliedRules.push('Combined worksheets');
				warnings.push(
					'Worksheet combination is simulated - actual results may vary',
				);
				break;
		}
	});

	return {
		data,
		headers,
		rowCount: data.length,
		colCount: data.length > 0 ? data[0].length : 0,
		appliedRules,
		warnings,
	};
}

function parseColumnIdentifier(identifier: string, headers: string[]): number {
	// Try parsing as column index (0-based)
	const index = parseInt(identifier);
	if (!isNaN(index)) {
		return index;
	}

	// Try parsing as column letter (A, B, C, etc.)
	if (identifier.match(/^[A-Z]+$/i)) {
		return XLSX.utils.decode_col(identifier.toUpperCase());
	}

	// Try finding by header name
	return headers.findIndex(
		(header) => header && header.toLowerCase() === identifier.toLowerCase(),
	);
}

function shouldDeleteRow(
	row: (string | number | null)[],
	condition: any,
	headers: string[],
): boolean {
	if (!condition) return false;

	switch (condition.type) {
		case 'empty':
			if (condition.column !== undefined && condition.column.trim() !== '') {
				// Check if specific column is empty
				const colIndex = parseColumnIdentifier(condition.column, headers);
				if (colIndex === -1) return false; // Column not found
				const cellValue = row[colIndex];
				return !cellValue || cellValue.toString().trim() === '';
			} else {
				// Check if entire row is empty (all columns)
				return row.every((cell) => !cell || cell.toString().trim() === '');
			}

		case 'contains':
			if (condition.column !== undefined && condition.column.trim() !== '') {
				const colIndex = parseColumnIdentifier(condition.column, headers);
				if (colIndex === -1) return false; // Column not found
				const cellValue = row[colIndex];
				return cellValue?.toString().includes(condition.value || '') ?? false;
			}
			return row.some(
				(cell) => cell && cell.toString().includes(condition.value || ''),
			);

		case 'pattern':
			const regex = new RegExp(condition.value || '', 'i');
			if (condition.column !== undefined && condition.column.trim() !== '') {
				const colIndex = parseColumnIdentifier(condition.column, headers);
				if (colIndex === -1) return false; // Column not found
				const cellValue = row[colIndex];
				return Boolean(cellValue && regex.test(cellValue.toString()));
			}
			return row.some((cell) => cell && regex.test(cell.toString()));

		default:
			return false;
	}
}

function fillColumn(
	data: (string | number | null)[][],
	colIndex: number,
	direction: 'up' | 'down',
): (string | number | null)[][] {
	const result = [...data];

	if (direction === 'down') {
		let lastValue: string | number | null = null;
		for (let i = 0; i < result.length; i++) {
			if (result[i][colIndex] && result[i][colIndex] !== null) {
				lastValue = result[i][colIndex];
			} else if (lastValue !== null) {
				result[i][colIndex] = lastValue;
			}
		}
	} else {
		let lastValue: string | number | null = null;
		for (let i = result.length - 1; i >= 0; i--) {
			if (result[i][colIndex] && result[i][colIndex] !== null) {
				lastValue = result[i][colIndex];
			} else if (lastValue !== null) {
				result[i][colIndex] = lastValue;
			}
		}
	}

	return result;
}
