import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

import type { TransformationRule } from '../types';
import type { UploadedFile } from './file-upload';

interface SpreadsheetPreviewProps {
	file: UploadedFile | null;
	rules: TransformationRule[];
	selectedWorksheet?: string;
}

interface CellHighlight {
	row: number;
	col: number;
	type: 'select' | 'delete' | 'modify' | 'warning';
	reason: string;
	ruleId: string;
}

interface WorksheetData {
	data: (string | number | null)[][];
	range: XLSX.Range;
}

export function SpreadsheetPreview({ file, rules, selectedWorksheet }: SpreadsheetPreviewProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [activeWorksheet, setActiveWorksheet] = useState(selectedWorksheet || '');
	const [showRowNumbers, setShowRowNumbers] = useState(true);
	const [showHighlights, setShowHighlights] = useState(true);

	const worksheetData = useMemo<WorksheetData | null>(() => {
		if (!file || !activeWorksheet) return null;
		
		const worksheet = file.workbook.Sheets[activeWorksheet];
		if (!worksheet) return null;

		const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
		const data: (string | number | null)[][] = [];

		for (let row = range.s.r; row <= range.e.r; row++) {
			const rowData: (string | number | null)[] = [];
			for (let col = range.s.c; col <= range.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
				const cell = worksheet[cellAddress];
				rowData.push(cell ? (cell.v ?? null) : null);
			}
			data.push(rowData);
		}

		return { data, range };
	}, [file, activeWorksheet]);

	const cellHighlights = useMemo<CellHighlight[]>(() => {
		if (!worksheetData || !showHighlights) return [];
		
		const highlights: CellHighlight[] = [];
		
		rules.forEach((rule) => {
			switch (rule.type) {
				case 'SELECT_WORKSHEET':
					if (rule.params.worksheetIdentifier === activeWorksheet) {
						// Highlight entire worksheet header
						for (let col = worksheetData.range.s.c; col <= worksheetData.range.e.c; col++) {
							highlights.push({
								row: 0,
								col,
								type: 'select',
								reason: `Selected worksheet: ${activeWorksheet}`,
								ruleId: rule.id,
							});
						}
					}
					break;

				case 'DELETE_COLUMNS':
					rule.params.columns?.forEach((colIdentifier: string) => {
						const colIndex = parseColumnIdentifier(colIdentifier, worksheetData.data[0] || []);
						if (colIndex !== -1) {
							for (let row = worksheetData.range.s.r; row <= worksheetData.range.e.r; row++) {
								highlights.push({
									row,
									col: colIndex,
									type: 'delete',
									reason: `Column will be deleted: ${colIdentifier}`,
									ruleId: rule.id,
								});
							}
						}
					});
					break;

				case 'DELETE_ROWS':
					const method = rule.params.method || 'condition';
					
					if (method === 'rows' && rule.params.rows) {
						// Highlight specific row numbers (1-based, convert to 0-based)
						rule.params.rows.forEach((rowNumber: number) => {
							const rowIndex = rowNumber - 1; // Convert to 0-based
							if (rowIndex >= 0 && rowIndex < worksheetData.data.length) {
								for (let col = worksheetData.range.s.c; col <= worksheetData.range.e.c; col++) {
									highlights.push({
										row: rowIndex,
										col,
										type: 'delete',
										reason: `Row ${rowNumber} will be deleted`,
										ruleId: rule.id,
									});
								}
							}
						});
					} else if (method === 'condition' && rule.params.condition) {
						// Highlight rows matching condition
						worksheetData.data.forEach((rowData, rowIndex) => {
							if (shouldDeleteRow(rowData, rule.params.condition)) {
								for (let col = worksheetData.range.s.c; col <= worksheetData.range.e.c; col++) {
									highlights.push({
										row: rowIndex,
										col,
										type: 'delete',
										reason: `Row matches delete condition`,
										ruleId: rule.id,
									});
								}
							}
						});
					}
					break;

				case 'UNMERGE_AND_FILL':
					rule.params.columns?.forEach((colIdentifier: string) => {
						const colIndex = parseColumnIdentifier(colIdentifier, worksheetData.data[0] || []);
						if (colIndex !== -1) {
							for (let row = worksheetData.range.s.r; row <= worksheetData.range.e.r; row++) {
								highlights.push({
									row,
									col: colIndex,
									type: 'modify',
									reason: `Will unmerge and fill ${rule.params.fillDirection}`,
									ruleId: rule.id,
								});
							}
						}
					});
					break;

				case 'VALIDATE_COLUMNS':
					const expectedCount = rule.params.expectedCount;
					const actualCount = worksheetData.range.e.c - worksheetData.range.s.c + 1;
					if (actualCount !== expectedCount) {
						for (let col = worksheetData.range.s.c; col <= worksheetData.range.e.c; col++) {
							highlights.push({
								row: 0,
								col,
								type: 'warning',
								reason: `Expected ${expectedCount} columns, found ${actualCount}`,
								ruleId: rule.id,
							});
						}
					}
					break;
			}
		});

		return highlights;
	}, [worksheetData, rules, activeWorksheet, showHighlights]);

	function parseColumnIdentifier(identifier: string, headerRow: (string | number | null)[]): number {
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
		return headerRow.findIndex(cell => 
			cell && cell.toString().toLowerCase() === identifier.toLowerCase()
		);
	}

	function shouldDeleteRow(rowData: (string | number | null)[], condition: any): boolean {
		if (!condition) return false;

		switch (condition.type) {
			case 'empty':
				if (condition.column !== undefined && condition.column.trim() !== '') {
					// Check if specific column is empty
					const colIndex = parseColumnIdentifier(condition.column, worksheetData?.data[0] || []);
					if (colIndex === -1) return false; // Column not found
					const cellValue = rowData[colIndex];
					return !cellValue || cellValue.toString().trim() === '';
				} else {
					// Check if entire row is empty (all columns)
					return rowData.every(cell => !cell || cell.toString().trim() === '');
				}
			
			case 'contains':
				if (condition.column !== undefined && condition.column.trim() !== '') {
					const colIndex = parseColumnIdentifier(condition.column, worksheetData?.data[0] || []);
					if (colIndex === -1) return false; // Column not found
					const cellValue = rowData[colIndex];
					return Boolean(cellValue && cellValue.toString().includes(condition.value || ''));
				}
				return rowData.some(cell => 
					cell && cell.toString().includes(condition.value || '')
				);
			
			case 'pattern':
				const regex = new RegExp(condition.value || '', 'i');
				if (condition.column !== undefined && condition.column.trim() !== '') {
					const colIndex = parseColumnIdentifier(condition.column, worksheetData?.data[0] || []);
					if (colIndex === -1) return false; // Column not found
					const cellValue = rowData[colIndex];
					return Boolean(cellValue && regex.test(cellValue.toString()));
				}
				return rowData.some(cell => 
					cell && regex.test(cell.toString())
				);
			
			default:
				return false;
		}
	}

	function getCellHighlight(row: number, col: number): CellHighlight | undefined {
		return cellHighlights.find(h => h.row === row && h.col === col);
	}

	function getCellClassName(row: number, col: number): string {
		const highlight = getCellHighlight(row, col);
		if (!highlight) return 'border border-gray-200 bg-white';

		switch (highlight.type) {
			case 'select':
				return 'border border-blue-300 bg-blue-50';
			case 'delete':
				return 'border border-red-300 bg-red-50 line-through';
			case 'modify':
				return 'border border-yellow-300 bg-yellow-50';
			case 'warning':
				return 'border border-orange-300 bg-orange-50';
			default:
				return 'border border-gray-200 bg-white';
		}
	}

	function getColumnLabel(index: number): string {
		return XLSX.utils.encode_col(index);
	}

	if (!file) {
		return (
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
				<Eye className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-medium text-gray-900">No File Uploaded</h3>
				<p className="mt-1 text-sm text-gray-500">
					Upload an Excel file to see the data preview
				</p>
			</div>
		);
	}

	// Set default worksheet if not selected
	if (!activeWorksheet && file.worksheets.length > 0) {
		setActiveWorksheet(file.worksheets[0]);
		return null;
	}

	if (isCollapsed) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white">
				<button
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
				>
					<h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
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
					<h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
					<div className="flex items-center space-x-3">
						<button
							onClick={() => setShowHighlights(!showHighlights)}
							className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
								showHighlights
									? 'bg-blue-100 text-blue-700'
									: 'bg-gray-100 text-gray-600'
							}`}
						>
							{showHighlights ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
							Highlights
						</button>
						<button
							onClick={() => setShowRowNumbers(!showRowNumbers)}
							className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
								showRowNumbers
									? 'bg-blue-100 text-blue-700'
									: 'bg-gray-100 text-gray-600'
							}`}
						>
							Row Numbers
						</button>
						<button
							onClick={() => setIsCollapsed(true)}
							className="text-gray-400 hover:text-gray-600"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</button>
					</div>
				</div>

				{/* Worksheet selector */}
				{file.worksheets.length > 1 && (
					<div className="mt-3">
						<label className="block text-sm font-medium text-gray-700">
							Worksheet
						</label>
						<select
							value={activeWorksheet}
							onChange={(e) => setActiveWorksheet(e.target.value)}
							className="mt-1 block rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
						>
							{file.worksheets.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* Spreadsheet */}
			<div className="max-h-96 overflow-auto p-4">
				{worksheetData && (
					<div className="inline-block min-w-full">
						<table className="border-collapse">
							<thead>
								<tr>
									{showRowNumbers && (
										<th className="border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
											#
										</th>
									)}
									{Array.from({ length: worksheetData.range.e.c - worksheetData.range.s.c + 1 }, (_, i) => (
										<th
											key={i}
											className="border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
										>
											{getColumnLabel(worksheetData.range.s.c + i)}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{worksheetData.data.slice(0, 20).map((row, rowIndex) => (
									<tr key={rowIndex}>
										{showRowNumbers && (
											<td className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-600">
												{rowIndex + 1}
											</td>
										)}
										{row.map((cell, colIndex) => {
											const highlight = getCellHighlight(rowIndex, colIndex);
											return (
												<td
													key={colIndex}
													className={`px-3 py-1 text-xs ${getCellClassName(rowIndex, colIndex)}`}
													title={highlight?.reason}
												>
													{cell?.toString() || ''}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
						{worksheetData.data.length > 20 && (
							<div className="mt-2 text-center text-xs text-gray-500">
								Showing first 20 rows of {worksheetData.data.length}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Legend */}
			{showHighlights && cellHighlights.length > 0 && (
				<div className="border-t border-gray-200 p-4">
					<h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
					<div className="flex flex-wrap gap-4 text-xs">
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-blue-300 bg-blue-50"></div>
							<span>Selected</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-red-300 bg-red-50"></div>
							<span>Will Delete</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-yellow-300 bg-yellow-50"></div>
							<span>Will Modify</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-orange-300 bg-orange-50"></div>
							<span>Warning</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}