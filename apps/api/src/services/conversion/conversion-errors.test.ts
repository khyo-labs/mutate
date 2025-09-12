import { describe, expect, it } from 'vitest';

import {
	ColumnValidationError,
	ConversionError,
	FileReadError,
	InvalidConfigurationError,
	RuleExecutionError,
	RuleValidationError,
	WorksheetNotFoundError,
} from './conversion-errors.js';
import { ConversionErrorHandler } from './error-handler.js';

describe('ConversionErrors', () => {
	describe('FileReadError', () => {
		it('creates error with proper code and message', () => {
			const error = new FileReadError('Failed to read file', { size: 1024 });
			expect(error.code).toBe('FILE_READ_ERROR');
			expect(error.message).toBe('Failed to read file');
			expect(error.details).toEqual({ size: 1024 });
		});
	});

	describe('WorksheetNotFoundError', () => {
		it('creates error with worksheet details', () => {
			const error = new WorksheetNotFoundError(
				'Sheet2',
				['Sheet1', 'Sheet3'],
				{ operation: 'select' },
			);
			expect(error.code).toBe('WORKSHEET_NOT_FOUND');
			expect(error.message).toContain('Sheet2');
			expect(error.message).toContain('Sheet1, Sheet3');
			expect(error.details?.worksheetName).toBe('Sheet2');
			expect(error.details?.availableSheets).toEqual(['Sheet1', 'Sheet3']);
		});
	});

	describe('ColumnValidationError', () => {
		it('creates error with column count details', () => {
			const error = new ColumnValidationError(5, 3, { sheetName: 'Data' });
			expect(error.code).toBe('COLUMN_VALIDATION_ERROR');
			expect(error.message).toContain('Expected 5 columns');
			expect(error.message).toContain('found 3');
			expect(error.details?.expected).toBe(5);
			expect(error.details?.actual).toBe(3);
		});
	});

	describe('RuleExecutionError', () => {
		it('creates error with rule details', () => {
			const error = new RuleExecutionError(
				'DELETE_ROWS',
				'Invalid row index',
				2,
				{ rowsDeleted: 0 },
			);
			expect(error.code).toBe('RULE_EXECUTION_ERROR');
			expect(error.message).toContain('DELETE_ROWS');
			expect(error.message).toContain('rule 3');
			expect(error.message).toContain('Invalid row index');
			expect(error.details?.ruleType).toBe('DELETE_ROWS');
			expect(error.details?.ruleIndex).toBe(2);
		});
	});
});

describe('ConversionErrorHandler', () => {
	describe('formatError', () => {
		it('formats ConversionError correctly', () => {
			const error = new FileReadError('Read failed', { size: 2048 });
			const context = { configurationName: 'Test Config' };
			const result = ConversionErrorHandler.formatError(error, context);
			
			expect(result.code).toBe('FILE_READ_ERROR');
			expect(result.message).toBe('Read failed');
			expect(result.details).toEqual({ size: 2048 });
			expect(result.context?.configurationName).toBe('Test Config');
			expect(result.context?.timestamp).toBeDefined();
		});

		it('formats generic Error correctly', () => {
			const error = new Error('Generic error');
			const result = ConversionErrorHandler.formatError(error);
			
			expect(result.code).toBe('CONVERSION_ERROR');
			expect(result.message).toBe('Generic error');
			expect(result.context?.timestamp).toBeDefined();
		});

		it('formats unknown error types', () => {
			const error = 'String error';
			const result = ConversionErrorHandler.formatError(error);
			
			expect(result.code).toBe('UNKNOWN_ERROR');
			expect(result.message).toBe('String error');
		});
	});

	describe('createUserFriendlyMessage', () => {
		it('creates message with rule context', () => {
			const error = {
				code: 'RULE_ERROR',
				message: 'Rule failed',
				context: { ruleType: 'DELETE_ROWS', ruleIndex: 1 },
			};
			
			const message = ConversionErrorHandler.createUserFriendlyMessage(error);
			expect(message).toContain('Rule failed');
			expect(message).toContain('Rule 2: DELETE_ROWS');
		});

		it('includes available sheets in message', () => {
			const error = {
				code: 'WORKSHEET_NOT_FOUND',
				message: 'Sheet not found',
				details: { availableSheets: ['Sheet1', 'Sheet2'] },
			};
			
			const message = ConversionErrorHandler.createUserFriendlyMessage(error);
			expect(message).toContain('Available sheets: Sheet1, Sheet2');
		});

		it('includes expected vs actual in message', () => {
			const error = {
				code: 'VALIDATION_ERROR',
				message: 'Validation failed',
				details: { expected: 5, actual: 3 },
			};
			
			const message = ConversionErrorHandler.createUserFriendlyMessage(error);
			expect(message).toContain('Expected: 5, Actual: 3');
		});
	});
});