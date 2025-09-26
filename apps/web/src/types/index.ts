// Shared types between frontend and backend
import type * as XLSX from 'xlsx';

export type UserRole = 'admin' | 'member' | 'viewer';
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
	params: Record<string, unknown>;
}

// Specific rule types
export interface SelectWorksheetRule extends BaseTransformationRule {
	type: 'SELECT_WORKSHEET';
	params: {
		value: string;
		type: 'name' | 'pattern' | 'index';
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

export type DeleteRowsParams = {
	method: 'condition' | 'rows';
	condition?: {
		type: 'contains' | 'empty' | 'pattern';
		column?: string;
		value?: string;
	};
	rows?: number[];
};

export interface DeleteRowsRule extends BaseTransformationRule {
	type: 'DELETE_ROWS';
	params: DeleteRowsParams;
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

export type CsvOutputFormat = {
	type: 'CSV';
	delimiter: string;
	encoding: 'UTF-8' | 'UTF-16' | 'ASCII';
	includeHeaders: boolean;
};

export type PdfOutputFormat = {
	type: 'PDF';
	pageSize: 'A4' | 'Letter' | 'Legal';
	orientation: 'portrait' | 'landscape';
	margins: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
};

export type JsonOutputFormat = {
	type: 'JSON';
	prettyPrint: boolean;
	encoding: 'UTF-8' | 'UTF-16';
};

export type OutputFormatConfig =
	| CsvOutputFormat
	| PdfOutputFormat
	| JsonOutputFormat;

// Configuration
export type Configuration = {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	conversionType: ConversionType;
	inputFormat: InputFormat;
	outputFormat: OutputFormatConfig;
	rules: TransformationRule[];
	webhookUrlId?: string | null;
	version: number;
	isActive: boolean;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
};

// API response types
export type SuccessResponse<T = unknown> = {
	success: true;
	data: T;
};

export type ErrorResponse = {
	success: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
};

export type PaginatedResponse<T> = {
	success: boolean;
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Auth types
export type User = {
	id: string;
	email: string;
	role: UserRole;
	organizationId: string;
	organizationName: string;
};

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
};

export type AuthState = {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
};

// Transformation job
export type TransformationJob = {
	id: string;
	organizationId: string;
	configurationId: string;
	status: JobStatus;
	inputFileUrl?: string;
	outputFileUrl?: string;
	errorMessage?: string;
	executionLog?: Record<string, unknown>;
	startedAt?: string;
	completedAt?: string;
	createdBy: string;
	createdAt: string;
};

// Form types
export type RegisterFormData = {
	email: string;
	password: string;
	name: string;
	role?: UserRole;
};

export type LoginFormData = {
	email: string;
	password: string;
};

export type ConfigurationFormData = {
	name: string;
	description?: string;
	conversionType: ConversionType;
	inputFormat: InputFormat;
	outputFormat: OutputFormatConfig;
	rules: TransformationRule[];
};

export type Webhook = {
	id: string;
	name: string;
	url: string;
	secret?: string;
	lastUsedAt?: string;
	createdAt: string;
	updatedAt: string;
};

export interface ProcessedData {
	data: (string | number | null)[][];
	headers: string[];
	rowCount: number;
	colCount: number;
	appliedRules: string[];
	warnings: string[];
}

export interface UploadedFile {
	name: string;
	size: number;
	data: File;
	workbook: XLSX.WorkBook;
	worksheets: string[];
}

export interface CellHighlight {
	row: number;
	col: number;
	type: 'select' | 'delete' | 'modify' | 'warning';
	reason: string;
	ruleId: string;
}
