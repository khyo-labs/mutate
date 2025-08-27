import { z } from 'zod';

// User roles
export type UserRole = 'admin' | 'member' | 'viewer';

// Job status
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Transformation rule types
export type RuleType =
	| 'SELECT_WORKSHEET'
	| 'VALIDATE_COLUMNS'
	| 'UNMERGE_AND_FILL'
	| 'DELETE_ROWS'
	| 'DELETE_COLUMNS'
	| 'COMBINE_WORKSHEETS'
	| 'EVALUATE_FORMULAS';

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
		sourceSheets: string[];
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

// Output format configuration
export interface OutputFormat {
	type: 'CSV';
	delimiter: string;
	encoding: 'UTF-8' | 'UTF-16' | 'ASCII';
	includeHeaders: boolean;
}

// Configuration structure
export interface Configuration {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	rules: TransformationRule[];
	outputFormat: OutputFormat;
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
