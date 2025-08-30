import type { Configuration } from '../../types/index.js';

export interface ConversionOptions {
	debug?: boolean;
}

export interface ConversionResult {
	success: boolean;
	outputData?: Buffer;
	error?: string;
	executionLog?: string[];
	mimeType?: string;
	fileExtension?: string;
}

export abstract class BaseConversionService {
	protected log: string[] = [];

	protected addLog(message: string) {
		this.log.push(`${new Date().toISOString()}: ${message}`);
		console.log(message);
	}

	protected clearLog() {
		this.log = [];
	}

	abstract convert(
		fileBuffer: Buffer,
		configuration: Configuration,
		options?: ConversionOptions,
	): Promise<ConversionResult>;

	protected validateConfiguration(configuration: Configuration): void {
		if (!configuration.conversionType) {
			throw new Error('Configuration must have a conversion type');
		}
		if (!configuration.inputFormat) {
			throw new Error('Configuration must have an input format');
		}
		if (!configuration.outputFormat) {
			throw new Error('Configuration must have an output format');
		}
	}
}