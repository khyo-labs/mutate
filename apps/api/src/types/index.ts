import { z } from 'zod';

// User roles
export type UserRole = 'admin' | 'member' | 'viewer';

// Job status
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Conversion types
export type ConversionType =
	| 'XLSX_TO_CSV'
	| 'DOCX_TO_PDF'
	| 'HTML_TO_PDF'
	| 'PDF_TO_CSV'
	| 'JSON_TO_CSV'
	| 'CSV_TO_JSON';

// Input/Output formats
export type InputFormat = 'XLSX' | 'DOCX' | 'HTML' | 'PDF' | 'JSON' | 'CSV';
export type OutputFormat = 'CSV' | 'PDF' | 'JSON';

// Conversion-specific rule types
export type XlsxToCsvRuleType =
	| 'SELECT_WORKSHEET'
	| 'VALIDATE_COLUMNS'
	| 'UNMERGE_AND_FILL'
	| 'DELETE_ROWS'
	| 'DELETE_COLUMNS'
	| 'COMBINE_WORKSHEETS'
	| 'EVALUATE_FORMULAS';

export type DocxToPdfRuleType = 'SET_MARGINS' | 'SET_ORIENTATION' | 'SET_FONT';

export type HtmlToPdfRuleType =
	| 'SET_PAGE_SIZE'
	| 'SET_MARGINS'
	| 'SET_HEADERS_FOOTERS';

export type PdfToCsvRuleType =
	| 'EXTRACT_TABLES'
	| 'SET_TABLE_DETECTION'
	| 'VALIDATE_EXTRACTION';

export type JsonToCsvRuleType =
	| 'FLATTEN_NESTED'
	| 'SELECT_FIELDS'
	| 'TRANSFORM_VALUES';

export type CsvToJsonRuleType =
	| 'SET_SCHEMA'
	| 'VALIDATE_DATA'
	| 'TRANSFORM_TYPES';

// Union type for all rule types
export type RuleType =
	| XlsxToCsvRuleType
	| DocxToPdfRuleType
	| HtmlToPdfRuleType
	| PdfToCsvRuleType
	| JsonToCsvRuleType
	| CsvToJsonRuleType;

// Base transformation rule
export interface BaseTransformationRule {
	id: string;
	type: RuleType;
	params: Record<string, any>;
}

// Specific rule types
export interface SelectWorksheetRule extends BaseTransformationRule {
	type: 'SELECT_WORKSHEET';
	params: {
		type: 'name' | 'pattern' | 'index';
		value: string;
	};
}

export interface ValidateColumnsRule extends BaseTransformationRule {
	type: 'VALIDATE_COLUMNS';
	params: {
		numOfColumns: number;
		onFailure: 'stop' | 'notify' | 'continue';
	};
}

export interface UnmergeAndFillRule extends BaseTransformationRule {
	type: 'UNMERGE_AND_FILL';
	params: {
		columns: string[];
		fillDirection: 'down' | 'up';
	};
}

export interface DeleteRowsRule extends BaseTransformationRule {
	type: 'DELETE_ROWS';
	params: {
		method: 'condition' | 'rows';
		condition?: {
			type: 'contains' | 'empty' | 'pattern';
			column?: string;
			value?: string;
		};
		rows?: number[]; // 1-based row numbers
	};
}

export interface DeleteColumnsRule extends BaseTransformationRule {
	type: 'DELETE_COLUMNS';
	params: {
		columns: string[];
	};
}

export interface CombineWorksheetsRule extends BaseTransformationRule {
    type: 'COMBINE_WORKSHEETS';
    params: {
        sourceSheets?: string[]; // Optional; defaults to previously selected sheets
        operation: 'append' | 'merge';
    };
}

export interface EvaluateFormulasRule extends BaseTransformationRule {
	type: 'EVALUATE_FORMULAS';
	params: {
		enabled: boolean;
	};
}

export type TransformationRule =
	| SelectWorksheetRule
	| ValidateColumnsRule
	| UnmergeAndFillRule
	| DeleteRowsRule
	| DeleteColumnsRule
	| CombineWorksheetsRule
	| EvaluateFormulasRule;

// Output format configurations
export interface CsvOutputFormat {
	type: 'CSV';
	delimiter: string;
	encoding: 'UTF-8' | 'UTF-16' | 'ASCII';
	includeHeaders: boolean;
}

export interface PdfOutputFormat {
	type: 'PDF';
	pageSize: 'A4' | 'Letter' | 'Legal';
	orientation: 'portrait' | 'landscape';
	margins: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
}

export interface JsonOutputFormat {
	type: 'JSON';
	prettyPrint: boolean;
	encoding: 'UTF-8' | 'UTF-16';
}

export type OutputFormatConfig =
	| CsvOutputFormat
	| PdfOutputFormat
	| JsonOutputFormat;

// Configuration structure
export interface Configuration {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	conversionType: ConversionType;
	inputFormat: InputFormat;
	outputFormat: OutputFormatConfig;
	rules: TransformationRule[];
	version: number;
	isActive: boolean;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

// API response types
export interface ApiSuccessResponse<T = any> {
	success: true;
	data: T;
}

export interface ApiErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, any>;
	};
}

export interface PaginatedResponse<T> {
	success: true;
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Auth types
export interface JWTPayload {
	userId: string;
	organizationId: string;
	role: UserRole;
	iat?: number;
	exp?: number;
}

// Transformation job
export interface TransformationJob {
	id: string;
	organizationId: string;
	configurationId: string;
	status: JobStatus;
	inputFileUrl?: string;
	outputFileUrl?: string;
	errorMessage?: string;
	executionLog?: Record<string, any>;
	startedAt?: Date;
	completedAt?: Date;
	createdBy: string;
	createdAt: Date;
}

// File processing options
export interface ProcessingOptions {
	async?: boolean;
	retention?: string;
	callback?: string;
}
