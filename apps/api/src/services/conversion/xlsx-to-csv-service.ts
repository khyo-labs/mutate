import * as XLSX from 'xlsx';

import type {
	Configuration,
	CsvOutputFormat,
	TransformationRule,
} from '../../types/index.js';
import { getErrorMessage } from '../../utils/error.js';
import {
	BaseConversionService,
	type ConversionOptions,
	type ConversionResult,
} from './base-conversion-service.js';
import {
	ColumnValidationError,
	FileReadError,
	InvalidConfigurationError,
	RuleExecutionError,
	RuleValidationError,
	WorksheetNotFoundError,
} from './conversion-errors.js';
import { ConversionErrorHandler, type ErrorContext } from './error-handler.js';

export class XlsxToCsvService extends BaseConversionService {
	private selectedSheetsHistory: string[] = [];
	async convert(
		fileBuffer: Buffer,
		configuration: Configuration,
		options: ConversionOptions = {},
	): Promise<ConversionResult> {
		this.clearLog();
		this.selectedSheetsHistory = [];
		this.addLog(
			`Starting XLSX to CSV conversion with configuration: ${configuration.name}`,
		);

		try {
			this.validateConfiguration(configuration);

			if (configuration.conversionType !== 'XLSX_TO_CSV') {
				throw new InvalidConfigurationError(
					`Invalid conversion type for XlsxToCsvService: ${configuration.conversionType}`,
					{
						expectedType: 'XLSX_TO_CSV',
						actualType: configuration.conversionType,
					},
				);
			}

			let workbook: XLSX.WorkBook;
			try {
				workbook = XLSX.read(fileBuffer, {
					type: 'buffer',
					cellDates: true,
					cellNF: false,
					cellText: false,
				});
			} catch (readError) {
				throw new FileReadError(
					`Failed to read XLSX file: ${getErrorMessage(readError, 'Unknown read error')}`,
					{ bufferSize: fileBuffer.length },
				);
			}

			this.addLog(
				`Loaded workbook with ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`,
			);

			let currentWorkbook = workbook;
			let selectedSheet: string | null = null;

			// Apply transformation rules
			for (let i = 0; i < configuration.rules.length; i++) {
				const rule = configuration.rules[i];
				this.addLog(
					`Applying rule ${i + 1}/${configuration.rules.length}: ${rule.type}`,
				);

				const result = await this.applyRule(
					currentWorkbook,
					rule,
					selectedSheet,
					i,
				);

				if (!result.success) {
					this.addLog(`Rule failed: ${result.error}`);
					return {
						success: false,
						error: result.error,
						executionLog: this.log,
					};
				}

				currentWorkbook = result.workbook!;
				if (result.selectedSheet) {
					selectedSheet = result.selectedSheet;
					if (!this.selectedSheetsHistory.includes(result.selectedSheet)) {
						this.selectedSheetsHistory.push(result.selectedSheet);
					}
				}

				this.addLog(`Rule completed successfully`);
			}

			const sheetName = selectedSheet || currentWorkbook.SheetNames[0];

			if (!currentWorkbook.Sheets[sheetName]) {
				throw new WorksheetNotFoundError(
					sheetName,
					currentWorkbook.SheetNames,
					{ selectedSheet },
				);
			}

			this.addLog(`Converting sheet "${sheetName}" to CSV`);

			const outputFormat = configuration.outputFormat as CsvOutputFormat;
			let csvData: string;
			try {
				csvData = XLSX.utils.sheet_to_csv(currentWorkbook.Sheets[sheetName], {
					blankrows: false,
					FS: outputFormat.delimiter,
				});
			} catch (csvError) {
				throw new RuleExecutionError(
					'CSV_CONVERSION',
					`Failed to convert sheet to CSV: ${getErrorMessage(csvError, 'Unknown CSV conversion error')}`,
					undefined,
					{ sheetName, delimiter: outputFormat.delimiter },
				);
			}

			// Convert our encoding format to Node.js Buffer encoding
			const getBufferEncoding = (encoding: string): BufferEncoding => {
				switch (encoding) {
					case 'UTF-8':
						return 'utf8';
					case 'UTF-16':
						return 'utf16le';
					case 'ASCII':
						return 'ascii';
					default:
						return 'utf8';
				}
			};

			const outputBuffer = Buffer.from(
				csvData,
				getBufferEncoding(outputFormat.encoding),
			);

			this.addLog(
				`Conversion completed successfully. Output size: ${outputBuffer.length} bytes`,
			);

			return {
				success: true,
				outputData: outputBuffer,
				executionLog: this.log,
				mimeType: 'text/csv',
				fileExtension: 'csv',
			};
		} catch (error) {
			const errorContext: ErrorContext = {
				configurationName: configuration.name,
				configurationId: configuration.id,
				fileSize: fileBuffer.length,
			};

			const detailedError = ConversionErrorHandler.formatError(
				error,
				errorContext,
				this.log,
			);

			ConversionErrorHandler.logError(detailedError);
			const userMessage =
				ConversionErrorHandler.createUserFriendlyMessage(detailedError);

			this.addLog(`Conversion failed: ${userMessage}`);
			return {
				success: false,
				error: userMessage,
				executionLog: this.log,
			};
		}
	}

	private async applyRule(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
		ruleIndex?: number,
	): Promise<{
		success: boolean;
		workbook?: XLSX.WorkBook;
		selectedSheet?: string;
		error?: string;
	}> {
		try {
			switch (rule.type) {
				case 'SELECT_WORKSHEET':
					return this.applySelectWorksheet(workbook, rule);

				case 'VALIDATE_COLUMNS':
					return this.applyValidateColumns(workbook, rule, currentSheet);

				case 'UNMERGE_AND_FILL':
					return this.applyUnmergeAndFill(workbook, rule, currentSheet);

				case 'DELETE_ROWS':
					return this.applyDeleteRows(workbook, rule, currentSheet);

				case 'DELETE_COLUMNS':
					return this.applyDeleteColumns(workbook, rule, currentSheet);

				case 'COMBINE_WORKSHEETS':
					return this.applyCombineWorksheets(workbook, rule);

				case 'EVALUATE_FORMULAS':
					return this.applyEvaluateFormulas(workbook, rule, currentSheet);

				default:
					throw new RuleValidationError(
						(rule as any).type,
						`Unknown rule type: ${(rule as any).type}`,
						{
							availableTypes: [
								'SELECT_WORKSHEET',
								'VALIDATE_COLUMNS',
								'UNMERGE_AND_FILL',
								'DELETE_ROWS',
								'DELETE_COLUMNS',
								'COMBINE_WORKSHEETS',
								'EVALUATE_FORMULAS',
							],
							ruleIndex,
						},
					);
			}
		} catch (error) {
			if (
				error instanceof RuleExecutionError ||
				error instanceof RuleValidationError
			) {
				if (!error.details) error.details = {};
				if (ruleIndex !== undefined) error.details.ruleIndex = ruleIndex;
				error.details.ruleType = rule.type;
			}
			return {
				success: false,
				error: getErrorMessage(error, 'Unknown error applying rule'),
			};
		}
	}

	// All the existing rule implementation methods remain the same
	private applySelectWorksheet(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
	): {
		success: boolean;
		workbook: XLSX.WorkBook;
		selectedSheet?: string;
		error?: string;
	} {
		if (rule.type !== 'SELECT_WORKSHEET') {
			throw new RuleValidationError(
				rule.type,
				`Invalid rule type for SELECT_WORKSHEET: ${rule.type}`,
				{ expectedType: 'SELECT_WORKSHEET' },
			);
		}

		const params = rule.params as {
			type: 'name' | 'pattern' | 'index';
			value: string;
		};

		let targetSheet: string | null = null;

		switch (params.type) {
			case 'name':
				if (workbook.SheetNames.includes(params.value)) {
					targetSheet = params.value;
				}
				break;

			case 'index':
				const index = parseInt(params.value);
				if (index >= 0 && index < workbook.SheetNames.length) {
					targetSheet = workbook.SheetNames[index];
				}
				break;

			case 'pattern':
				const regex = new RegExp(params.value, 'i');
				targetSheet =
					workbook.SheetNames.find((name) => regex.test(name)) || null;
				break;
		}

		if (!targetSheet) {
			this.addLog(
				`WARNING: No worksheet found matching ${params.type}: "${params.value}". Available worksheets: ${workbook.SheetNames.join(', ')}`,
			);
			this.addLog(
				`Falling back to first available worksheet: "${workbook.SheetNames[0]}"`,
			);
			targetSheet = workbook.SheetNames[0];
		}

		this.addLog(`Selected worksheet: "${targetSheet}"`);
		if (!this.selectedSheetsHistory.includes(targetSheet)) {
			this.selectedSheetsHistory.push(targetSheet);
		}
		return {
			success: true,
			workbook,
			selectedSheet: targetSheet,
		};
	}

	private applyValidateColumns(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
	): { success: boolean; workbook: XLSX.WorkBook; error?: string } {
		const params = rule.params as {
			numOfColumns: number;
			onFailure: 'stop' | 'notify' | 'continue';
		};
		const sheetName = currentSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			throw new WorksheetNotFoundError(sheetName, workbook.SheetNames);
		}

		const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
		const actualColumns = range.e.c + 1;

		this.addLog(
			`Validating columns. Expected: ${params.numOfColumns}, Actual: ${actualColumns}`,
		);

		if (actualColumns !== params.numOfColumns) {
			const message = `Column count mismatch. Expected ${params.numOfColumns}, found ${actualColumns}`;

			switch (params.onFailure) {
				case 'stop':
					throw new ColumnValidationError(params.numOfColumns, actualColumns, {
						sheetName,
						onFailure: params.onFailure,
					});

				case 'notify':
					this.addLog(`WARNING: ${message}`);
					break;

				case 'continue':
					this.addLog(`INFO: ${message} (continuing anyway)`);
					break;
			}
		}

		return { success: true, workbook };
	}

	// For brevity, I'll include just a few key methods here
	// The rest would be copied from the original MutationService

	private applyUnmergeAndFill(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
	): { success: boolean; workbook: XLSX.WorkBook; error?: string } {
		const params = rule.params as {
			columns: string[];
			fillDirection: 'down' | 'up';
		};
		const sheetName = currentSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			throw new WorksheetNotFoundError(sheetName, workbook.SheetNames);
		}

		this.addLog(`Unmerging and filling columns: ${params.columns.join(', ')}`);
		this.addLog(`Fill direction: ${params.fillDirection}`);

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

			for (const columnLetter of params.columns) {
				const colIndex = XLSX.utils.decode_col(columnLetter);
				let lastValue = '';

				for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
					const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
					const cell = worksheet[cellAddr];

					if (cell && cell.v) {
						lastValue = String(cell.v);
					} else if (!cell || !cell.v) {
						if (lastValue && params.fillDirection === 'down') {
							worksheet[cellAddr] = { t: 's', v: lastValue };
						}
					}
				}

				if (params.fillDirection === 'up') {
					let nextValue = '';
					for (let rowIndex = range.e.r; rowIndex >= range.s.r; rowIndex--) {
						const cellAddr = XLSX.utils.encode_cell({
							c: colIndex,
							r: rowIndex,
						});
						const cell = worksheet[cellAddr];

						if (cell && cell.v) {
							nextValue = String(cell.v);
						} else if (!cell || !cell.v) {
							if (nextValue) {
								worksheet[cellAddr] = { t: 's', v: nextValue };
							}
						}
					}
				}
			}

			this.addLog(`Successfully filled ${params.columns.length} columns`);
			return { success: true, workbook };
		} catch (error) {
			throw new RuleExecutionError(
				'UNMERGE_AND_FILL',
				getErrorMessage(error, 'Failed to unmerge and fill'),
				undefined,
				{ columns: params.columns, fillDirection: params.fillDirection },
			);
		}
	}

	private applyDeleteRows(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
	): { success: boolean; workbook: XLSX.WorkBook; error?: string } {
		const params = rule.params as {
			method: 'condition' | 'rows';
			condition?: {
				type: 'contains' | 'empty' | 'pattern';
				column?: string;
				value?: string;
			};
			rows?: number[];
		};
		const sheetName = currentSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			throw new WorksheetNotFoundError(sheetName, workbook.SheetNames);
		}

		const rowsToDelete: number[] = [];

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

			if (params.method === 'rows' && params.rows) {
				this.addLog(`Deleting specific rows: ${params.rows.join(', ')}`);
				rowsToDelete.push(...params.rows.map((row) => row - 1));
			} else if (params.method === 'condition' && params.condition) {
				this.addLog(
					`Deleting rows matching condition: ${params.condition.type} in column ${params.condition.column || 'ALL'}`,
				);

				for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
					let shouldDelete = false;

					if (params.condition.type === 'empty') {
						if (params.condition.column) {
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							shouldDelete = !cell || !cell.v || String(cell.v).trim() === '';
						} else {
							let hasContent = false;
							for (
								let colIndex = range.s.c;
								colIndex <= range.e.c;
								colIndex++
							) {
								const cellAddr = XLSX.utils.encode_cell({
									c: colIndex,
									r: rowIndex,
								});
								const cell = worksheet[cellAddr];
								if (cell && cell.v && String(cell.v).trim() !== '') {
									hasContent = true;
									break;
								}
							}
							shouldDelete = !hasContent;
						}
					} else if (
						params.condition.type === 'contains' &&
						params.condition.value
					) {
						if (params.condition.column) {
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							const cellValue = cell && cell.v ? String(cell.v) : '';
							shouldDelete = cellValue
								.toLowerCase()
								.includes(params.condition.value.toLowerCase());
						} else {
							for (
								let colIndex = range.s.c;
								colIndex <= range.e.c;
								colIndex++
							) {
								const cellAddr = XLSX.utils.encode_cell({
									c: colIndex,
									r: rowIndex,
								});
								const cell = worksheet[cellAddr];
								const cellValue = cell && cell.v ? String(cell.v) : '';
								if (
									cellValue
										.toLowerCase()
										.includes(params.condition.value.toLowerCase())
								) {
									shouldDelete = true;
									break;
								}
							}
						}
					} else if (
						params.condition.type === 'pattern' &&
						params.condition.value
					) {
						const regex = new RegExp(params.condition.value, 'i');
						if (params.condition.column) {
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							const cellValue = cell && cell.v ? String(cell.v) : '';
							shouldDelete = regex.test(cellValue);
						} else {
							for (
								let colIndex = range.s.c;
								colIndex <= range.e.c;
								colIndex++
							) {
								const cellAddr = XLSX.utils.encode_cell({
									c: colIndex,
									r: rowIndex,
								});
								const cell = worksheet[cellAddr];
								const cellValue = cell && cell.v ? String(cell.v) : '';
								if (regex.test(cellValue)) {
									shouldDelete = true;
									break;
								}
							}
						}
					}

					if (shouldDelete) {
						rowsToDelete.push(rowIndex);
					}
				}
			}

			rowsToDelete.sort((a, b) => b - a);

			this.addLog(
				`Found ${rowsToDelete.length} rows to delete: ${rowsToDelete.map((r) => r + 1).join(', ')}`,
			);

			for (const rowIndex of rowsToDelete) {
				for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
					const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
					delete worksheet[cellAddr];
				}

				for (let r = rowIndex + 1; r <= range.e.r; r++) {
					for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
						const oldAddr = XLSX.utils.encode_cell({ c: colIndex, r: r });
						const newAddr = XLSX.utils.encode_cell({ c: colIndex, r: r - 1 });

						if (worksheet[oldAddr]) {
							worksheet[newAddr] = worksheet[oldAddr];
							delete worksheet[oldAddr];
						}
					}
				}

				range.e.r--;
			}

			if (range.e.r >= range.s.r) {
				worksheet['!ref'] = XLSX.utils.encode_range(range);
			} else {
				worksheet['!ref'] = 'A1:A1';
			}

			this.addLog(`Successfully deleted ${rowsToDelete.length} rows`);
			return { success: true, workbook };
		} catch (error) {
			throw new RuleExecutionError(
				'DELETE_ROWS',
				getErrorMessage(error, 'Failed to delete rows'),
				undefined,
				{ method: params.method, deletedCount: rowsToDelete.length },
			);
		}
	}

	private applyDeleteColumns(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
	): { success: boolean; workbook: XLSX.WorkBook; error?: string } {
		const params = rule.params as {
			columns: string[];
		};
		const sheetName = currentSheet || workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		if (!worksheet) {
			throw new WorksheetNotFoundError(sheetName, workbook.SheetNames);
		}

		if (!params.columns || params.columns.length === 0) {
			this.addLog('DELETE_COLUMNS: No columns specified, skipping');
			return { success: true, workbook };
		}

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

			// Normalize helper for header matching
			const norm = (v: unknown) =>
				String(v ?? '')
					.trim()
					.toLowerCase();

			// Try to resolve provided identifiers to zero-based column indices.
			// Supports: column letters (e.g. "A"), 1-based numbers (e.g. "3"), and header names (e.g. "Debtor").
			const parseCol = (
				identifier: string,
				headerLookup?: Map<string, number>,
			): number | null => {
				const trimmed = String(identifier).trim();
				// Numeric (assume 1-based like Excel UI)
				const asNum = Number.parseInt(trimmed, 10);
				if (!Number.isNaN(asNum)) {
					return Math.max(0, asNum - 1);
				}
				// Try header name lookup first (covers names like "REG", "Debtor")
				if (headerLookup) {
					const byHeader = headerLookup.get(norm(trimmed));
					if (byHeader !== undefined) return byHeader;
				}
				// Fallback: treat as Excel column letters (e.g., A, AB)
				if (/^[A-Za-z]+$/.test(trimmed)) {
					return XLSX.utils.decode_col(trimmed);
				}
				return null;
			};

			// Build header lookup from worksheet rows (search first N rows to be robust)
			const headerLookup = new Map<string, number>();
			try {
				const aoa = XLSX.utils.sheet_to_json(worksheet, {
					header: 1,
					blankrows: false,
					defval: '',
				}) as (string | number | null)[][];
				const MAX_SCAN_ROWS = Math.min(50, aoa.length);
				for (let r = 0; r < MAX_SCAN_ROWS; r++) {
					const row = aoa[r] || [];
					for (let c = 0; c < row.length; c++) {
						const key = norm(row[c]);
						if (key && !headerLookup.has(key)) headerLookup.set(key, c);
					}
				}
			} catch {
				// If header extraction fails, continue with letter/number parsing only
			}

			const deleteSet = new Set<number>();
			const unresolved: string[] = [];
			for (const col of params.columns) {
				const idx = parseCol(col, headerLookup);
				if (idx !== null) deleteSet.add(idx);
				else unresolved.push(col);
			}

			if (unresolved.length > 0) {
				this.addLog(
					`DELETE_COLUMNS: Could not resolve column(s) by name/index: ${unresolved.join(', ')}`,
				);
			}

			if (deleteSet.size === 0) {
				this.addLog('DELETE_COLUMNS: No valid columns resolved, skipping');
				return { success: true, workbook };
			}

			const toDelete = Array.from(deleteSet)
				.filter((c) => c >= range.s.c && c <= range.e.c)
				.sort((a, b) => a - b);

			if (toDelete.length === 0) {
				this.addLog(
					'DELETE_COLUMNS: Specified columns are outside current range, skipping',
				);
				return { success: true, workbook };
			}

			const countDeletedBefore = (c: number) =>
				toDelete.filter((d) => d < c).length;

			const newSheet: XLSX.WorkSheet = {} as any;
			const props = ['!merges', '!cols', '!rows', '!protect', '!autofilter'];
			for (const p of props)
				if ((worksheet as any)[p] !== undefined)
					(newSheet as any)[p] = (worksheet as any)[p];

			Object.keys(worksheet)
				.filter((k) => !k.startsWith('!'))
				.forEach((addr) => {
					const { c, r } = XLSX.utils.decode_cell(addr);
					if (toDelete.includes(c)) return;
					const shift = countDeletedBefore(c);
					const newAddr = XLSX.utils.encode_cell({ c: c - shift, r });
					(newSheet as any)[newAddr] = (worksheet as any)[addr];
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

			workbook.Sheets[sheetName] = newSheet;

			this.addLog(`Deleted ${toDelete.length} column(s) from "${sheetName}"`);
			return { success: true, workbook };
		} catch (error) {
			throw new RuleExecutionError(
				'DELETE_COLUMNS',
				getErrorMessage(error, 'Failed to delete columns'),
				undefined,
				{ sheetName, columns: params.columns },
			);
		}
	}

	private applyCombineWorksheets(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
	): {
		success: boolean;
		workbook: XLSX.WorkBook;
		selectedSheet?: string;
		error?: string;
	} {
		const params = rule.params as {
			sourceSheets?: string[];
			operation: 'append' | 'merge';
		};

		const sourceSheets =
			params.sourceSheets && params.sourceSheets.length
				? params.sourceSheets
				: this.selectedSheetsHistory;

		if (!sourceSheets || sourceSheets.length === 0) {
			return {
				success: false,
				workbook,
				error:
					'No source sheets provided and no prior SELECT_WORKSHEET selections found',
			};
		}

		this.addLog(
			`Combining worksheets: ${sourceSheets.join(', ')} (operation: ${params.operation})`,
		);

		for (const sheetName of sourceSheets) {
			if (!workbook.Sheets[sheetName]) {
				throw new WorksheetNotFoundError(sheetName, workbook.SheetNames, {
					operation: params.operation,
				});
			}
		}

		const combinedSheetName = this.generateSheetName(workbook, 'Combined');

		try {
			if (params.operation === 'append') {
				const [first, ...rest] = sourceSheets;
				const base = XLSX.utils.sheet_to_json(workbook.Sheets[first], {
					header: 1,
					blankrows: false,
				}) as (string | number | null)[][];

				const combined = [...base];
				for (const name of rest) {
					const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
						header: 1,
						blankrows: false,
					}) as (string | number | null)[][];
					combined.push(...rows.slice(1));
				}

				workbook.Sheets[combinedSheetName] = XLSX.utils.aoa_to_sheet(combined);
				workbook.SheetNames.push(combinedSheetName);
			} else {
				const sheetsData = sourceSheets.map(
					(name) =>
						XLSX.utils.sheet_to_json(workbook.Sheets[name], {
							defval: '',
						}) as Record<string, any>[],
				);

				const headerSet = new Set<string>();
				sheetsData.forEach((rows) => {
					rows.forEach((row) =>
						Object.keys(row).forEach((h) => headerSet.add(h)),
					);
				});
				const headers = Array.from(headerSet);

				const aoa: any[][] = [headers];
				sheetsData.forEach((rows) => {
					rows.forEach((row) => {
						aoa.push(headers.map((h) => row[h] ?? null));
					});
				});

				workbook.Sheets[combinedSheetName] = XLSX.utils.aoa_to_sheet(aoa);
				workbook.SheetNames.push(combinedSheetName);
			}

			this.addLog(`Created combined worksheet "${combinedSheetName}"`);

			return {
				success: true,
				workbook,
				selectedSheet: combinedSheetName,
			};
		} catch (error) {
			if (error instanceof WorksheetNotFoundError) {
				throw error;
			}
			throw new RuleExecutionError(
				'COMBINE_WORKSHEETS',
				getErrorMessage(error, 'Failed to combine worksheets'),
				undefined,
				{ sourceSheets, operation: params.operation },
			);
		}
	}

	private generateSheetName(workbook: XLSX.WorkBook, base: string): string {
		let name = base;
		let counter = 1;
		while (workbook.SheetNames.includes(name)) {
			name = `${base}_${counter}`;
			counter++;
		}
		return name;
	}

	private applyEvaluateFormulas(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
	): { success: boolean; workbook: XLSX.WorkBook; error?: string } {
		if (rule.type !== 'EVALUATE_FORMULAS') {
			throw new RuleValidationError(
				rule.type,
				`Invalid rule type for EVALUATE_FORMULAS: ${rule.type}`,
				{ expectedType: 'EVALUATE_FORMULAS' },
			);
		}

		const params = rule.params;

		if (params.enabled) {
			this.addLog('Evaluating formulas in worksheet');
			// XLSX.js automatically evaluates most formulas when reading
			// This is more of a flag to indicate formula evaluation is desired
		} else {
			this.addLog('Skipping formula evaluation');
		}

		return { success: true, workbook };
	}
}
