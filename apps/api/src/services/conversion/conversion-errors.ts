import { AppError } from '../../utils/error.js';

export class ConversionError extends AppError {
	constructor(
		code: string,
		message: string,
		public details?: Record<string, any>,
	) {
		super(code, message);
		this.name = 'ConversionError';
	}
}

export class FileReadError extends ConversionError {
	constructor(message: string, details?: Record<string, any>) {
		super('FILE_READ_ERROR', message, details);
		this.name = 'FileReadError';
	}
}

export class WorksheetNotFoundError extends ConversionError {
	constructor(
		worksheetName: string,
		availableSheets: string[],
		details?: Record<string, any>,
	) {
		super(
			'WORKSHEET_NOT_FOUND',
			`Worksheet "${worksheetName}" not found. Available worksheets: ${availableSheets.join(', ')}`,
			{ worksheetName, availableSheets, ...details },
		);
		this.name = 'WorksheetNotFoundError';
	}
}

export class RuleValidationError extends ConversionError {
	constructor(
		ruleType: string,
		message: string,
		details?: Record<string, any>,
	) {
		super('RULE_VALIDATION_ERROR', message, { ruleType, ...details });
		this.name = 'RuleValidationError';
	}
}

export class RuleExecutionError extends ConversionError {
	constructor(
		ruleType: string,
		message: string,
		ruleIndex?: number,
		details?: Record<string, any>,
	) {
		super(
			'RULE_EXECUTION_ERROR',
			`Failed to execute ${ruleType} rule${ruleIndex !== undefined ? ` (rule ${ruleIndex + 1})` : ''}: ${message}`,
			{ ruleType, ruleIndex, ...details },
		);
		this.name = 'RuleExecutionError';
	}
}

export class ColumnValidationError extends ConversionError {
	constructor(expected: number, actual: number, details?: Record<string, any>) {
		super(
			'COLUMN_VALIDATION_ERROR',
			`Column count mismatch. Expected ${expected} columns, found ${actual}`,
			{ expected, actual, ...details },
		);
		this.name = 'ColumnValidationError';
	}
}

export class InvalidConfigurationError extends ConversionError {
	constructor(message: string, details?: Record<string, any>) {
		super('INVALID_CONFIGURATION', message, details);
		this.name = 'InvalidConfigurationError';
	}
}

export class CellOperationError extends ConversionError {
	constructor(
		operation: string,
		message: string,
		cellAddress?: string,
		details?: Record<string, any>,
	) {
		super(
			'CELL_OPERATION_ERROR',
			`Failed to ${operation} cell${cellAddress ? ` at ${cellAddress}` : ''}: ${message}`,
			{ operation, cellAddress, ...details },
		);
		this.name = 'CellOperationError';
	}
}

export class EncodingError extends ConversionError {
	constructor(
		encoding: string,
		message: string,
		details?: Record<string, any>,
	) {
		super('ENCODING_ERROR', `Encoding error with ${encoding}: ${message}`, {
			encoding,
			...details,
		});
		this.name = 'EncodingError';
	}
}
