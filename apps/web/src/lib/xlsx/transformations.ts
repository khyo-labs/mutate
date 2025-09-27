import * as XLSX from 'xlsx';

import type { ProcessedData, TransformationRule, UploadedFile } from '@/types';

import { parseColumnIdentifier } from './column-utils';
import { evaluateFormula } from './formula-evaluator';
import { shouldDeleteRow } from './row-utils';

/**
 * Convert JavaScript Date to Excel serial number
 */
function dateToExcelSerial(date: Date): number {
	// Excel epoch is December 30, 1899
	const excelEpoch = new Date(1899, 11, 30);
	const msPerDay = 24 * 60 * 60 * 1000;
	const serial = Math.floor((date.getTime() - excelEpoch.getTime()) / msPerDay);
	// Add 1 to account for Excel's leap year bug (1900 is treated as a leap year)
	return serial + (serial > 59 ? 1 : 0);
}

/**
 * Extract cell value with proper formatting handling
 */
function getCellValue(
	cell: XLSX.CellObject | undefined,
	options: { convertDatesToSerial?: boolean } = {},
): string | number | null {
	if (!cell) return null;

	const { convertDatesToSerial = true } = options;

	// Get the base value
	let value = null;

	if (cell.v !== undefined) {
		// Handle dates
		if (cell.v instanceof Date) {
			value = convertDatesToSerial
				? dateToExcelSerial(cell.v)
				: cell.v.toISOString();
		} else {
			value = cell.v;
		}
	} else if (cell.w !== undefined) {
		// Use formatted text as fallback
		value = cell.w;
	}

	return value as string | number | null;
}

export function fillColumn(
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

export function escapeValues(value: string, delimiter: string): string {
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

export function deleteColumnsFromWorksheet(
	worksheet: XLSX.WorkSheet,
	colsToDelete: number[],
): XLSX.WorkSheet {
	const ref = worksheet['!ref'] as string | undefined;
	const range = XLSX.utils.decode_range(ref || 'A1:A1');
	if (colsToDelete.length === 0) return worksheet;

	const toDelete = colsToDelete
		.filter((c) => c >= range.s.c && c <= range.e.c)
		.sort((a, b) => a - b);
	if (toDelete.length === 0) return worksheet;

	const countDeletedBefore = (c: number) =>
		toDelete.filter((d) => d < c).length;
	const newSheet: XLSX.WorkSheet = {} as XLSX.WorkSheet;
	const props = [
		'!merges',
		'!cols',
		'!rows',
		'!protect',
		'!autofilter',
	] as const;
	for (const p of props)
		if (worksheet[p] !== undefined)
			(newSheet as Record<string, unknown>)[p] = worksheet[p];

	Object.keys(worksheet)
		.filter((k) => !k.startsWith('!'))
		.forEach((addr) => {
			const { c, r } = XLSX.utils.decode_cell(addr);
			if (toDelete.includes(c)) return;
			const shift = countDeletedBefore(c);
			const newAddr = XLSX.utils.encode_cell({ c: c - shift, r });
			(newSheet as Record<string, unknown>)[newAddr] = worksheet[addr];
		});

	const newEndC = range.e.c - toDelete.length;
	if (newEndC >= range.s.c) {
		newSheet['!ref'] = XLSX.utils.encode_range({
			s: range.s,
			e: { c: newEndC, r: range.e.r },
		});
	} else {
		newSheet['!ref'] = 'A1:A1';
	}

	return newSheet;
}

export function simulateTransformations(
	file: UploadedFile,
	rules: TransformationRule[],
): ProcessedData {
	const appliedRules: string[] = [];
	const warnings: string[] = [];

	// Check if any EVALUATE_FORMULAS rule specifies date conversion preference
	const evaluateFormulaRule = rules.find(
		(r) => r.type === 'EVALUATE_FORMULAS',
	) as import('@/types').EvaluateFormulasRule | undefined;
	const convertDatesToSerial =
		evaluateFormulaRule?.params?.convertDatesToSerial ?? true;

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
			const value = getCellValue(cell, { convertDatesToSerial });
			rowData.push(value);
		}
		data.push(rowData);
	}

	// Extract headers (first row)
	let headers: string[] =
		data.length > 0
			? data[0].map((cell, index) => cell?.toString() || `Column ${index + 1}`)
			: [];

	// Track selected worksheets to support defaults in COMBINE_WORKSHEETS
	const selectedSheetsHistory: string[] = [];

	// Apply transformations in order
	rules.forEach((rule) => {
		switch (rule.type) {
			case 'SELECT_WORKSHEET': {
				let targetWorksheet: string | null = null;

				switch (rule.params.type) {
					case 'name':
						targetWorksheet = rule.params.value;
						break;
					case 'index':
						targetWorksheet =
							file.worksheets[Number.parseInt(rule.params.value)];
						break;
					case 'pattern':
						targetWorksheet =
							file.worksheets.find((worksheet) =>
								worksheet.match(rule.params.value),
							) || null;
						break;
				}

				if (targetWorksheet && file.worksheets.includes(targetWorksheet)) {
					activeWorksheet = targetWorksheet;
					worksheet = file.workbook.Sheets[activeWorksheet];
					range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

					data = [];

					for (let row = range.s.r; row <= range.e.r; row++) {
						const rowData: (string | number | null)[] = [];
						for (let col = range.s.c; col <= range.e.c; col++) {
							const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
							const cell = worksheet[cellAddress];
							const value = getCellValue(cell, { convertDatesToSerial });
							rowData.push(value);
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
					if (!selectedSheetsHistory.includes(targetWorksheet)) {
						selectedSheetsHistory.push(targetWorksheet);
					}
				} else {
					warnings.push(`Worksheet "${targetWorksheet}" not found`);
				}
				break;
			}

			case 'VALIDATE_COLUMNS': {
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
			}

			case 'DELETE_COLUMNS': {
				const columnsToDelete = rule.params.columns || [];
				const deleteIndices: number[] = [];

				columnsToDelete.forEach((colIdentifier: string) => {
					const colIndex = parseColumnIdentifier(colIdentifier, headers);
					if (colIndex !== -1 && !deleteIndices.includes(colIndex)) {
						deleteIndices.push(colIndex);
					}
				});

				deleteIndices.sort((a, b) => b - a);

				deleteIndices.forEach((colIndex) => {
					data = data.map((row) =>
						row.filter((_, index) => index !== colIndex),
					);
					headers = headers.filter((_, index) => index !== colIndex);
				});

				// Also apply the delete to the underlying worksheet so later rules (e.g., COMBINE_WORKSHEETS)
				// that read directly from workbook.Sheets see the modified sheet
				if (deleteIndices.length > 0 && activeWorksheet) {
					const ws = file.workbook.Sheets[activeWorksheet];
					if (ws) {
						const sortedAsc = [...deleteIndices].sort((a, b) => a - b);
						const newWs = deleteColumnsFromWorksheet(ws, sortedAsc);
						file.workbook.Sheets[activeWorksheet] = newWs;
					}
				}

				if (deleteIndices.length > 0) {
					appliedRules.push(
						`Deleted ${deleteIndices.length} column${deleteIndices.length !== 1 ? 's' : ''}`,
					);
				}
				break;
			}
			case 'DELETE_ROWS': {
				const method = rule.params.method || 'condition';
				const initialRowCount = data.length;

				console.log('method', {
					initialRowCount,
					method,
					rules: JSON.stringify(rules),
				});

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
			}
			case 'UNMERGE_AND_FILL': {
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
			}
			case 'EVALUATE_FORMULAS': {
				if (rule.params.enabled) {
					// Get the current worksheet
					const ws = file.workbook.Sheets[activeWorksheet];
					if (ws) {
						const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
						let formulaCount = 0;
						let evaluatedCount = 0;

						// Iterate through all cells to find formulas
						for (let row = range.s.r; row <= range.e.r; row++) {
							for (let col = range.s.c; col <= range.e.c; col++) {
								const cellAddr = XLSX.utils.encode_cell({ c: col, r: row });
								const cell = ws[cellAddr];

								if (cell && cell.f) {
									// Cell has a formula
									formulaCount++;

									// Try to evaluate the formula (pass cell format for percentage handling)
									const evaluatedValue = evaluateFormula(cell.f, ws, cell.z);

									// If we successfully evaluated the formula, use that value
									// Otherwise fall back to cached value
									let value = evaluatedValue;

									if (value === null || value === undefined) {
										// Fall back to cached value if evaluation failed
										if (cell.v !== undefined && cell.v !== null) {
											value = cell.v;
										} else if (cell.w !== undefined && cell.w !== null) {
											// Try to parse the formatted text as a number if possible
											const parsed = Number(cell.w);
											value = !isNaN(parsed) ? parsed : cell.w;
										}
									}

									// Store the evaluated value back in the cell
									if (value !== null && value !== undefined) {
										cell.v = value;
										// Remove the formula since we've evaluated it
										delete cell.f;
										evaluatedCount++;
									}
								}
							}
						}

						if (formulaCount > 0) {
							appliedRules.push(
								`Found ${formulaCount} formula${formulaCount !== 1 ? 's' : ''}, evaluated ${evaluatedCount}`,
							);
							if (evaluatedCount < formulaCount) {
								warnings.push(
									`${formulaCount - evaluatedCount} formula${formulaCount - evaluatedCount !== 1 ? 's' : ''} could not be evaluated`,
								);
							}

							// Re-extract data from the worksheet after evaluating formulas
							// This ensures the data array reflects the evaluated values
							const updatedRange = XLSX.utils.decode_range(
								ws['!ref'] || 'A1:A1',
							);
							const updatedData: (string | number | null)[][] = [];

							for (let row = updatedRange.s.r; row <= updatedRange.e.r; row++) {
								const rowData: (string | number | null)[] = [];
								for (
									let col = updatedRange.s.c;
									col <= updatedRange.e.c;
									col++
								) {
									const cellAddress = XLSX.utils.encode_cell({
										r: row,
										c: col,
									});
									const cell = ws[cellAddress];
									const value = getCellValue(cell, { convertDatesToSerial });
									rowData.push(value);
								}
								updatedData.push(rowData);
							}

							// Update the data array with the re-extracted values
							data = updatedData;

							// Update headers if they might have changed
							headers =
								data.length > 0
									? data[0].map(
											(cell, index) =>
												cell?.toString() || `Column ${index + 1}`,
										)
									: [];
						} else {
							appliedRules.push('No formulas found to evaluate');
						}
					}
				} else {
					appliedRules.push('Formula evaluation disabled');
				}
				break;
			}
			case 'COMBINE_WORKSHEETS': {
				const params = rule.params as {
					sourceSheets?: string[];
					operation?: 'append' | 'merge';
				};

				const sheets =
					params.sourceSheets && params.sourceSheets.length
						? params.sourceSheets
						: selectedSheetsHistory;
				const operation = params.operation || 'append';

				if (sheets.length === 0) {
					warnings.push(
						'No source sheets provided and no prior SELECT_WORKSHEET selections found',
					);
					break;
				}

				const missing = sheets.filter((s) => !file.workbook.Sheets[s]);
				if (missing.length > 0) {
					warnings.push(`Source sheet(s) not found: ${missing.join(', ')}`);
					break;
				}

				if (operation === 'append') {
					const [first, ...rest] = sheets;
					const base = XLSX.utils.sheet_to_json(file.workbook.Sheets[first], {
						header: 1,
						blankrows: false,
					}) as (string | number | null)[][];

					const combined = [...base];
					for (const name of rest) {
						const rows = XLSX.utils.sheet_to_json(file.workbook.Sheets[name], {
							header: 1,
							blankrows: false,
						}) as (string | number | null)[][];
						combined.push(...rows.slice(1));
					}
					data = combined;
					headers =
						combined.length > 0
							? combined[0].map(
									(cell, index) => cell?.toString() || `Column ${index + 1}`,
								)
							: [];
				} else {
					const sheetsData = sheets.map(
						(name) =>
							XLSX.utils.sheet_to_json(file.workbook.Sheets[name], {
								defval: '',
							}) as Record<string, unknown>[],
					);

					const headerSet = new Set<string>();
					sheetsData.forEach((rows) => {
						rows.forEach((row) =>
							Object.keys(row).forEach((h) => headerSet.add(h)),
						);
					});
					const headerArr = Array.from(headerSet);

					const aoa: unknown[][] = [headerArr];
					sheetsData.forEach((rows) => {
						rows.forEach((row) => {
							aoa.push(headerArr.map((h) => row[h] ?? null));
						});
					});
					data = aoa as (string | number | null)[][];
					headers = headerArr;
				}

				appliedRules.push(
					`Combined ${sheets.length} worksheet${
						sheets.length !== 1 ? 's' : ''
					} (${operation})`,
				);
				break;
			}
			case 'REPLACE_CHARACTERS': {
				const replacements = rule.params.replacements || [];
				let totalReplacements = 0;

				replacements.forEach((replacement) => {
					const { find, replace, scope = 'all', columns, rows } = replacement;

					// Convert column letters to indices
					const columnIndices = columns?.map((col) => {
						const colIndex = col.charCodeAt(0) - 65; // A=0, B=1, etc.
						return colIndex;
					});

					data = data.map((row, rowIndex) => {
						// Check if this row should be processed
						if (
							scope === 'specific_rows' &&
							rows &&
							!rows.includes(rowIndex + 1)
						) {
							return row;
						}

						return row.map((cell, colIndex) => {
							// Check if this column should be processed
							if (
								scope === 'specific_columns' &&
								columnIndices &&
								!columnIndices.includes(colIndex)
							) {
								return cell;
							}

							// Convert cell to string for replacement
							if (cell !== null && cell !== undefined) {
								const cellStr = String(cell);
								const newValue = cellStr.split(find).join(replace);

								if (cellStr !== newValue) {
									totalReplacements++;
									// Try to preserve number type if possible
									const numValue = Number(newValue);
									return !isNaN(numValue) && cellStr === String(Number(cellStr))
										? numValue
										: newValue;
								}
							}
							return cell;
						});
					});
				});

				if (totalReplacements > 0) {
					appliedRules.push(
						`Replaced characters in ${totalReplacements} cell${totalReplacements !== 1 ? 's' : ''}`,
					);
				}
				break;
			}
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
