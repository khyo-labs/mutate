import { ConversionError } from './conversion-errors.js';
import { getErrorMessage } from '../../utils/error.js';

export interface ErrorContext {
	configurationId?: string;
	configurationName?: string;
	ruleIndex?: number;
	ruleType?: string;
	worksheetName?: string;
	availableWorksheets?: string[];
	fileSize?: number;
	timestamp?: string;
	[key: string]: any;
}

export interface DetailedError {
	code: string;
	message: string;
	details?: Record<string, any>;
	context?: ErrorContext;
	stack?: string;
	executionLog?: string[];
}

export class ConversionErrorHandler {
	static formatError(
		error: unknown,
		context?: ErrorContext,
		executionLog?: string[],
	): DetailedError {
		const timestamp = new Date().toISOString();
		
		if (error instanceof ConversionError) {
			return {
				code: error.code,
				message: error.message,
				details: error.details,
				context: { ...context, timestamp },
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
				executionLog,
			};
		}
		
		if (error instanceof Error) {
			return {
				code: 'CONVERSION_ERROR',
				message: error.message,
				context: { ...context, timestamp },
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
				executionLog,
			};
		}
		
		return {
			code: 'UNKNOWN_ERROR',
			message: getErrorMessage(error, 'An unknown error occurred during conversion'),
			context: { ...context, timestamp },
			executionLog,
		};
	}
	
	static createUserFriendlyMessage(error: DetailedError): string {
		const messages: string[] = [error.message];
		
		if (error.context?.ruleType && error.context?.ruleIndex !== undefined) {
			messages.push(`(Rule ${error.context.ruleIndex + 1}: ${error.context.ruleType})`);
		}
		
		if (error.details?.availableSheets) {
			messages.push(`Available sheets: ${error.details.availableSheets.join(', ')}`);
		}
		
		if (error.details?.expected && error.details?.actual) {
			messages.push(`Expected: ${error.details.expected}, Actual: ${error.details.actual}`);
		}
		
		return messages.join(' ');
	}
	
	static logError(error: DetailedError, logger?: Console): void {
		const log = logger || console;
		
		log.error('Conversion Error:', {
			code: error.code,
			message: error.message,
			context: error.context,
			details: error.details,
		});
		
		if (error.stack && process.env.NODE_ENV === 'development') {
			log.error('Stack trace:', error.stack);
		}
		
		if (error.executionLog && error.executionLog.length > 0) {
			log.error('Execution log:');
			error.executionLog.forEach(entry => log.error(`  ${entry}`));
		}
	}
}