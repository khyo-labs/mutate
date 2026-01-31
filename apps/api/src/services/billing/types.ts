export interface ConversionLimits {
	monthlyConversionLimit: number | null;
	concurrentConversionLimit: number | null;
	maxFileSizeMb: number | null;
	overagePriceCents: number | null;
}

export interface UsageStats {
	currentUsage: number;
	overageUsage: number;
	remainingConversions: number | null;
	activeConversions: number;
	maxFileSize: number | null;
	resetDate: Date;
}

export interface BillingPeriod {
	start: Date;
	end: Date;
	month: number;
	year: number;
}

export interface QuotaValidationResult {
	canProceed: boolean;
	reason?: string;
	limits: ConversionLimits;
	usage: UsageStats;
}

export type QuotaStatusResponse = {
	subscription: {
		planName: string;
		status: string;
	} | null;
	usage: {
		currentMonth: number;
		currentMonthOverage: number;
		activeConversions: number;
	};
	limits: {
		monthly: number;
		concurrent: number;
		maxFileSizeMb: number;
	};
	remaining: {
		monthly: number;
		concurrent: number;
	};
	periodEnd: string;
	warnings: string[];
};

export type ConversionType = 'XLSX_TO_CSV' | 'DOCX_TO_PDF';

export interface ConversionEvent {
	organizationId: string;
	jobId: string;
	conversionType: ConversionType;
	fileSize: number;
	timestamp: Date;
}
