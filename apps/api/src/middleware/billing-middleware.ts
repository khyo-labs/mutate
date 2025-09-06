import type { FastifyReply, FastifyRequest } from 'fastify';

import {
	QuotaEnforcementService,
	UsageTrackingService,
} from '../services/billing/index.js';
import type { ConversionEvent } from '../services/billing/types.js';

const quotaService = new QuotaEnforcementService();
const usageService = new UsageTrackingService();

export async function validateQuotaMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const organizationId = request.currentUser?.organizationId;
	if (!organizationId) {
		return reply.status(401).send({
			success: false,
			error: 'No active organization',
		});
	}

	// Extract file size from request (assuming multipart file upload)
	let fileSizeMb = 0;
	if (
		request.body &&
		typeof request.body === 'object' &&
		'file' in request.body
	) {
		const file = (request.body as any).file;
		if (file && file.size) {
			fileSizeMb = file.size / (1024 * 1024); // Convert bytes to MB
		}
	}

	const validation = await quotaService.validateConversionQuota(
		organizationId,
		fileSizeMb,
	);

	if (!validation.canProceed) {
		return reply.status(403).send({
			success: false,
			error: validation.reason,
			limits: validation.limits,
			usage: validation.usage,
		});
	}

	// Store validation result in request context for later use
	(request as any).quotaValidation = validation;
}

export async function trackConversionStart(
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

	await usageService.recordConversionStart(event);
}

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

export async function trackConversionFailure(
	organizationId: string,
	jobId: string,
): Promise<void> {
	await usageService.recordConversionFailure(organizationId, jobId);
}
