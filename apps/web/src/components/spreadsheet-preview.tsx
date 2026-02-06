import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

import { parseColumnIdentifier } from '@/lib/xlsx/column-utils';
import { shouldDeleteRow } from '@/lib/xlsx/row-utils';

import type { CellHighlight, TransformationRule, UploadedFile } from '../types';

interface SpreadsheetPreviewProps {
	file: UploadedFile | null;
	rules: TransformationRule[];
	selectedWorksheet?: string;
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
	// const shouldDeleteRow = useCallback(
	// 	function (
	// 		rowData: (string | number | null)[],
	// 		condition: unknown,
	// 	): boolean {
	// 		if (!condition) return false;

	// 		const cond = condition as {
	// 			type: string;
	// 			column?: string;
	// 			value?: string;
	// 		};
	// 		switch (cond.type) {
	// 			case 'empty':
	// 				if (cond.column !== undefined && cond.column.trim() !== '') {
	// 					// Check if specific column is empty
	// 					const headers =
	// 						worksheetData?.data[0]?.map((cell) => cell?.toString() || '') ||
	// 						[];
	// 					const colIndex = parseColumnIdentifier(cond.column, headers);
	// 					if (colIndex === -1) return false; // Column not found
	// 					const cellValue = rowData[colIndex];
	// 					return !cellValue || cellValue.toString().trim() === '';
	// 				} else {
	// 					// Check if entire row is empty (all columns)
	// 					return rowData.every(
	// 						(cell) => !cell || cell.toString().trim() === '',
	// 					);
	// 				}

	// 			case 'contains':
	// 				if (cond.column !== undefined && cond.column.trim() !== '') {
	// 					const headers =
	// 						worksheetData?.data[0]?.map((cell) => cell?.toString() || '') ||
	// 						[];
	// 					const colIndex = parseColumnIdentifier(cond.column, headers);
	// 					if (colIndex === -1) return false; // Column not found
	// 					const cellValue = rowData[colIndex];
	// 					return Boolean(
	// 						cellValue && cellValue.toString().includes(cond.value || ''),
	// 					);
	// 				}
	// 				return rowData.some(
	// 					(cell) => cell && cell.toString().includes(cond.value || ''),
	// 				);

	// 			case 'pattern': {
	// 				const regex = new RegExp(cond.value || '', 'i');
	// 				if (cond.column !== undefined && cond.column.trim() !== '') {
	// 					const headers =
	// 						worksheetData?.data[0]?.map((cell) => cell?.toString() || '') ||
	// 						[];
	// 					const colIndex = parseColumnIdentifier(cond.column, headers);
	// 					if (colIndex === -1) return false; // Column not found
	// 					const cellValue = rowData[colIndex];
	// 					return Boolean(cellValue && regex.test(cellValue.toString()));
	// 				}
	// 				return rowData.some((cell) => cell && regex.test(cell.toString()));
	// 			}
	// 			default:
	// 				return false;
	// 		}
	// 	},
	// 	[worksheetData],
	// );

	const cellHighlights = useMemo<CellHighlight[]>(() => {
		if (!worksheetData || !showHighlights) return [];

		const highlights: CellHighlight[] = [];
		const headers: string[] =
			worksheetData.data.length > 0
				? worksheetData.data[0].map((cell, index) => cell?.toString() || `Column ${index + 1}`)
				: [];

		rules.forEach((rule) => {
			switch (rule.type) {
				case 'SELECT_WORKSHEET':
					if (rule.params.value === activeWorksheet) {
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

				case 'DELETE_COLUMNS': {
					const columnsToRemove = rule.params.columns || [];
					const removedIndices: number[] = [];

					columnsToRemove.forEach((colIdentifier: string) => {
						const colIndex = parseColumnIdentifier(colIdentifier, headers);
						if (colIndex !== -1 && !removedIndices.includes(colIndex)) {
							removedIndices.push(colIndex);
						}
					});

					removedIndices.sort((a, b) => b - a);
					removedIndices.forEach((colIndex) => {
						for (let row = worksheetData.range.s.r; row <= worksheetData.range.e.r; row++) {
							const colIdentifier = headers[colIndex];
							highlights.push({
								row,
								col: colIndex,
								type: 'delete',
								reason: `Column will be deleted: ${colIdentifier}`,
								ruleId: rule.id,
							});
						}
					});

					rule.params.columns?.forEach((colIdentifier: string) => {
						const headers = worksheetData.data[0]?.map((cell) => cell?.toString() || '') || [];
						const colIndex = parseColumnIdentifier(colIdentifier, headers);
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
				}
				case 'DELETE_ROWS': {
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
							const headers: string[] =
								worksheetData.data.length > 0
									? worksheetData.data[0].map(
											(cell, index) => cell?.toString() || `Column ${index + 1}`,
										)
									: [];

							if (shouldDeleteRow(rowData, rule.params.condition, headers)) {
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
				}

				case 'UNMERGE_AND_FILL':
					rule.params.columns?.forEach((colIdentifier: string) => {
						const headers = worksheetData.data[0]?.map((cell) => cell?.toString() || '') || [];
						const colIndex = parseColumnIdentifier(colIdentifier, headers);
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

				case 'VALIDATE_COLUMNS': {
					const numOfColumns = rule.params.numOfColumns;
					const actualCount = worksheetData.range.e.c - worksheetData.range.s.c + 1;
					if (actualCount !== numOfColumns) {
						for (let col = worksheetData.range.s.c; col <= worksheetData.range.e.c; col++) {
							highlights.push({
								row: 0,
								col,
								type: 'warning',
								reason: `Expected ${numOfColumns} columns, found ${actualCount}`,
								ruleId: rule.id,
							});
						}
					}
					break;
				}
			}
		});

		return highlights;
	}, [worksheetData, rules, activeWorksheet, showHighlights]);

	function getCellHighlight(row: number, col: number): CellHighlight | undefined {
		return cellHighlights.find((h) => h.row === row && h.col === col);
	}

	function getCellClassName(row: number, col: number): string {
		const highlight = getCellHighlight(row, col);
		if (!highlight) return 'border border-border bg-card';

		switch (highlight.type) {
			case 'select':
				return 'border border-blue-300/70 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/15';
			case 'delete':
				return 'border border-red-300/70 bg-red-50 line-through dark:border-red-500/40 dark:bg-red-500/15';
			case 'modify':
				return 'border border-yellow-300/70 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/15';
			case 'warning':
				return 'border border-orange-300/70 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/15';
			default:
				return 'border border-border bg-card';
		}
	}

	function getColumnLabel(index: number): string {
		return XLSX.utils.encode_col(index);
	}

	if (!file) {
		return (
			<div className="rounded-lg border border-border bg-muted/40 p-8 text-center">
				<Eye className="mx-auto h-12 w-12 text-muted-foreground" />
				<h3 className="mt-2 text-sm font-medium text-foreground">No File Uploaded</h3>
				<p className="mt-1 text-sm text-muted-foreground">
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
			<div className="rounded-lg border border-border bg-card text-card-foreground">
				<button
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/60"
				>
					<h3 className="text-lg font-medium text-foreground">Data Preview</h3>
					<ChevronDown className="h-5 w-5 text-muted-foreground" />
				</button>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-card text-card-foreground">
			{/* Header */}
			<div className="border-b border-border p-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-medium text-foreground">Data Preview</h3>
					<div className="flex items-center space-x-3">
						<button
							onClick={() => setShowHighlights(!showHighlights)}
							className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
								showHighlights
									? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
									: 'bg-muted text-muted-foreground'
							}`}
						>
							{showHighlights ? (
								<Eye className="mr-1 h-3 w-3" />
							) : (
								<EyeOff className="mr-1 h-3 w-3" />
							)}
							Highlights
						</button>
						<button
							onClick={() => setShowRowNumbers(!showRowNumbers)}
							className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
								showRowNumbers
									? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
									: 'bg-muted text-muted-foreground'
							}`}
						>
							Row Numbers
						</button>
						<button
							onClick={() => setIsCollapsed(true)}
							className="text-muted-foreground hover:text-foreground"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</button>
					</div>
				</div>

				{/* Worksheet selector */}
				{file.worksheets.length > 1 && (
					<div className="mt-3">
						<label className="block text-sm font-medium text-foreground">Worksheet</label>
						<select
							value={activeWorksheet}
							onChange={(e) => setActiveWorksheet(e.target.value)}
							className="mt-1 block w-full rounded border border-input bg-background px-3 py-1 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
										<th className="border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-muted-foreground">
											#
										</th>
									)}
									{Array.from(
										{
											length: worksheetData.range.e.c - worksheetData.range.s.c + 1,
										},
										(_, i) => (
											<th
												key={i}
												className="border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground"
											>
												{getColumnLabel(worksheetData.range.s.c + i)}
											</th>
										),
									)}
								</tr>
							</thead>
							<tbody>
								{worksheetData.data.slice(0, 20).map((row, rowIndex) => (
									<tr key={rowIndex}>
										{showRowNumbers && (
											<td className="border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
												{rowIndex + 1}
											</td>
										)}
										{row.map((cell, colIndex) => {
											const highlight = getCellHighlight(rowIndex, colIndex);
											return (
												<td
													key={colIndex}
													className={`px-3 py-1 text-xs text-foreground ${getCellClassName(rowIndex, colIndex)}`}
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
							<div className="mt-2 text-center text-xs text-muted-foreground">
								Showing first 20 rows of {worksheetData.data.length}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Legend */}
			{showHighlights && cellHighlights.length > 0 && (
				<div className="border-t border-border p-4">
					<h4 className="mb-2 text-sm font-medium text-foreground">Legend</h4>
					<div className="flex flex-wrap gap-4 text-xs">
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-blue-300/70 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/15"></div>
							<span>Selected</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-red-300/70 bg-red-50 dark:border-red-500/40 dark:bg-red-500/15"></div>
							<span>Will Delete</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-yellow-300/70 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/15"></div>
							<span>Will Modify</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-3 w-3 border border-orange-300/70 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/15"></div>
							<span>Warning</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
