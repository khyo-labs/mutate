import type { Configuration, ConversionType } from '../../types/index.js';
import { BaseConversionService } from './base-conversion-service.js';
import { XlsxToCsvService } from './xlsx-to-csv-service.js';

export class ConversionServiceFactory {
	private static services = new Map<
		ConversionType,
		() => BaseConversionService
	>([
		['XLSX_TO_CSV', () => new XlsxToCsvService()],
		// Only XLSX_TO_CSV is currently supported - other services will be added as they're implemented
	]);

	static getService(conversionType: ConversionType): BaseConversionService {
		const serviceFactory = this.services.get(conversionType);

		if (!serviceFactory) {
			throw new Error(
				`No service found for conversion type: ${conversionType}`,
			);
		}

		return serviceFactory();
	}

	static getSupportedConversions(): ConversionType[] {
		return Array.from(this.services.keys());
	}

	static isConversionSupported(conversionType: ConversionType): boolean {
		return this.services.has(conversionType);
	}

	static async convertFile(
		fileBuffer: Buffer,
		configuration: Configuration,
		options?: { debug?: boolean },
	) {
		const service = this.getService(configuration.conversionType);
		return await service.convert(fileBuffer, configuration, options);
	}
}
