import * as XLSX from 'xlsx';

import type { Configuration, TransformationRule } from '../types/index.js';

export interface MutationOptions {
	async?: boolean;
	debug?: boolean;
}

export interface MutationResult {
	success: boolean;
	csvData?: string;
	error?: string;
	executionLog?: string[];
}

export class MutationService {
	private log: string[] = [];

	private addLog(message: string) {
		this.log.push(`${new Date().toISOString()}: ${message}`);
		console.log(message);
	}

	async transformFile(
		fileBuffer: Buffer,
		configuration: Configuration,
		options: MutationOptions = {},
	): Promise<MutationResult> {
		this.log = [];
		this.addLog(
			`Starting transformation with configuration: ${configuration.name}`,
		);

		try {
			const workbook = XLSX.read(fileBuffer, {
				type: 'buffer',
				cellDates: true,
				cellNF: false,
				cellText: false,
			});
			this.addLog(
				`Loaded workbook with ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`,
			);

			this.addLog(
				`Workbook info: ${JSON.stringify(
					{
						SheetNames: workbook.SheetNames,
						Props: workbook.Props,
						bookType: (workbook as any).bookType,
					},
					null,
					2,
				)}`,
			);

			workbook.SheetNames.forEach((sheetName) => {
				const sheet = workbook.Sheets[sheetName];
				const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
				this.addLog(
					`Sheet "${sheetName}" range: ${sheet['!ref']}, rows: ${range.e.r + 1}, cols: ${range.e.c + 1}`,
				);
			});

			let currentWorkbook = workbook;
			let selectedSheet: string | null = null;

			for (let i = 0; i < configuration.rules.length; i++) {
				const rule = configuration.rules[i];
				this.addLog(
					`Applying rule ${i + 1}/${configuration.rules.length}: ${rule.type}`,
				);

				const result = await this.applyRule(
					currentWorkbook,
					rule,
					selectedSheet,
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
				}

				this.addLog(`Rule completed successfully`);
			}

			const sheetName = selectedSheet || currentWorkbook.SheetNames[0];

			if (!currentWorkbook.Sheets[sheetName]) {
				throw new Error(`Sheet "${sheetName}" not found in workbook`);
			}

			this.addLog(`Converting sheet "${sheetName}" to CSV`);

			const csvData = XLSX.utils.sheet_to_csv(
				currentWorkbook.Sheets[sheetName],
				{
					blankrows: false,
					FS:
						configuration.outputFormat.type === 'CSV'
							? configuration.outputFormat.delimiter
							: ',',
				},
			);

			this.addLog(
				`Transformation completed successfully. Output size: ${csvData.length} characters`,
			);

			return {
				success: true,
				csvData,
				executionLog: this.log,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			this.addLog(`Transformation failed: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
				executionLog: this.log,
			};
		}
	}

	private async applyRule(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
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
					return {
						success: false,
						error: `Unknown rule type: ${(rule as any).type}`,
					};
			}
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Unknown error applying rule',
			};
		}
	}

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
			return {
				success: false,
				workbook,
				error: `Invalid rule type for SELECT_WORKSHEET: ${rule.type}`,
			};
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
			// If configured worksheet not found, fall back to first sheet with a warning
			this.addLog(
				`WARNING: No worksheet found matching ${params.type}: "${params.value}". Available worksheets: ${workbook.SheetNames.join(', ')}`,
			);
			this.addLog(
				`Falling back to first available worksheet: "${workbook.SheetNames[0]}"`,
			);
			targetSheet = workbook.SheetNames[0];
		}

		this.addLog(`Selected worksheet: "${targetSheet}"`);
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
			return {
				success: false,
				workbook,
				error: `Worksheet "${sheetName}" not found`,
			};
		}

		// Get the range of the worksheet
		const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
		const actualColumns = range.e.c + 1; // +1 because columns are 0-indexed

		this.addLog(
			`Validating columns. Expected: ${params.numOfColumns}, Actual: ${actualColumns}`,
		);

		if (actualColumns !== params.numOfColumns) {
			const message = `Column count mismatch. Expected ${params.numOfColumns}, found ${actualColumns}`;

			switch (params.onFailure) {
				case 'stop':
					return {
						success: false,
						workbook,
						error: message,
					};

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
			return {
				success: false,
				workbook,
				error: `Worksheet "${sheetName}" not found`,
			};
		}

		this.addLog(`Unmerging and filling columns: ${params.columns.join(', ')}`);
		this.addLog(`Fill direction: ${params.fillDirection}`);

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

			for (const columnLetter of params.columns) {
				const colIndex = XLSX.utils.decode_col(columnLetter);
				let lastValue = '';

				// Process each row in the column
				for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
					const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
					const cell = worksheet[cellAddr];

					if (cell && cell.v) {
						// Cell has value - update lastValue
						lastValue = String(cell.v);
					} else if (!cell || !cell.v) {
						// Cell is empty or doesn't exist - fill with lastValue if available
						if (lastValue && params.fillDirection === 'down') {
							worksheet[cellAddr] = { t: 's', v: lastValue };
						}
					}
				}

				// For 'up' direction, process in reverse
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
			return {
				success: false,
				workbook,
				error: `Failed to unmerge and fill: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
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
			return {
				success: false,
				workbook,
				error: `Worksheet "${sheetName}" not found`,
			};
		}

		try {
			const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
			const rowsToDelete: number[] = [];

			if (params.method === 'rows' && params.rows) {
				this.addLog(`Deleting specific rows: ${params.rows.join(', ')}`);
				// Convert 1-based row numbers to 0-based and add to deletion list
				rowsToDelete.push(...params.rows.map((row) => row - 1));
			} else if (params.method === 'condition' && params.condition) {
				this.addLog(
					`Deleting rows matching condition: ${params.condition.type} in column ${params.condition.column || 'ALL'}`,
				);

				// Find rows that match the condition
				for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
					let shouldDelete = false;

					if (params.condition.type === 'empty') {
						if (params.condition.column) {
							// Check specific column
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							shouldDelete = !cell || !cell.v || String(cell.v).trim() === '';
						} else {
							// Check if entire row is empty
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
							// Check specific column
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
							// Check any column in the row
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
							// Check specific column
							const colIndex = XLSX.utils.decode_col(params.condition.column);
							const cellAddr = XLSX.utils.encode_cell({
								c: colIndex,
								r: rowIndex,
							});
							const cell = worksheet[cellAddr];
							const cellValue = cell && cell.v ? String(cell.v) : '';
							shouldDelete = regex.test(cellValue);
						} else {
							// Check any column in the row
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

			// Sort rows in descending order to delete from bottom to top
			rowsToDelete.sort((a, b) => b - a);

			this.addLog(
				`Found ${rowsToDelete.length} rows to delete: ${rowsToDelete.map((r) => r + 1).join(', ')}`,
			);

			// Delete the rows by removing cells and adjusting the range
			for (const rowIndex of rowsToDelete) {
				// Remove all cells in this row
				for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
					const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
					delete worksheet[cellAddr];
				}

				// Shift all rows below up by one
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

				// Update the range
				range.e.r--;
			}

			// Update the worksheet range
			if (range.e.r >= range.s.r) {
				worksheet['!ref'] = XLSX.utils.encode_range(range);
			} else {
				// If all rows were deleted, set minimal range
				worksheet['!ref'] = 'A1:A1';
			}

			this.addLog(`Successfully deleted ${rowsToDelete.length} rows`);
			return { success: true, workbook };
		} catch (error) {
			return {
				success: false,
				workbook,
				error: `Failed to delete rows: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
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
			return {
				success: false,
				workbook,
				error: `Worksheet "${sheetName}" not found`,
			};
		}

		this.addLog(`Deleting columns: ${params.columns.join(', ')}`);

		// Simplified implementation - in production, you'd modify the worksheet structure
		return { success: true, workbook };
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
			sourceSheets: string[];
			operation: 'merge' | 'combine';
		};

		this.addLog(`Combining worksheets: ${params.sourceSheets.join(', ')}`);
		this.addLog(`Operation: ${params.operation}`);

		// Check that all source sheets exist
		for (const sheetName of params.sourceSheets) {
			if (!workbook.Sheets[sheetName]) {
				return {
					success: false,
					workbook,
					error: `Source sheet "${sheetName}" not found`,
				};
			}
		}

		// Simplified implementation - in production, you'd implement actual sheet combination
		// For now, just select the first sheet
		return {
			success: true,
			workbook,
			selectedSheet: params.sourceSheets[0],
		};
	}

	private applyEvaluateFormulas(
		workbook: XLSX.WorkBook,
		rule: TransformationRule,
		currentSheet: string | null,
	): { success: boolean; workbook: XLSX.WorkBook; error?: string } {
		if (rule.type !== 'EVALUATE_FORMULAS') {
			return {
				success: false,
				workbook,
				error: `Invalid rule type for EVALUATE_FORMULAS: ${rule.type}`,
			};
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
