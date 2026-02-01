import { QuotaEnforcementService, UsageTrackingService } from '@/services/billing/index.js';
import type { ConversionEvent } from '@/services/billing/types.js';

const quotaService = new QuotaEnforcementService();
const usageService = new UsageTrackingService();

export async function trackConversionComplete(
	organizationId: string,
	jobId: string,
	conversionType: 'XLSX_TO_CSV' | 'DOCX_TO_PDF',
	fileSize: number,
): Promise<void> {
	const event: ConversionEvent = {
		organizationId,
		jobId,
		conversionType,
		fileSize,
		timestamp: new Date(),
	};

	const isOverage = await quotaService.isOverageConversion(organizationId);

	if (isOverage) {
		await usageService.recordOverageConversion(event);
	} else {
		await usageService.recordConversionComplete(event);
	}
}

export async function trackConversionFailure(organizationId: string, jobId: string): Promise<void> {
	await usageService.recordConversionFailure(organizationId, jobId);
}
