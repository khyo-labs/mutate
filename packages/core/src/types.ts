export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ConversionType =
	| 'XLSX_TO_CSV'
	| 'DOCX_TO_PDF'
	| 'HTML_TO_PDF'
	| 'PDF_TO_CSV'
	| 'JSON_TO_CSV'
	| 'CSV_TO_JSON';

export type InputFormat = 'XLSX' | 'DOCX' | 'HTML' | 'PDF' | 'JSON' | 'CSV';
export type OutputFormat = 'CSV' | 'PDF' | 'JSON';

export type XlsxToCsvRuleType =
	| 'SELECT_WORKSHEET'
	| 'VALIDATE_COLUMNS'
	| 'UNMERGE_AND_FILL'
	| 'DELETE_ROWS'
	| 'DELETE_COLUMNS'
	| 'COMBINE_WORKSHEETS'
	| 'EVALUATE_FORMULAS'
	| 'REPLACE_CHARACTERS';

export type RuleType = XlsxToCsvRuleType; // Can be extended later

export interface BaseTransformationRule {
	id: string;
	type: RuleType;
	params: Record<string, any>;
}

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
		rows?: number[];
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
		sourceSheets?: string[];
		operation: 'append' | 'merge';
	};
}

export interface EvaluateFormulasRule extends BaseTransformationRule {
	type: 'EVALUATE_FORMULAS';
	params: {
		enabled: boolean;
	};
}

export interface ReplaceCharactersRule extends BaseTransformationRule {
	type: 'REPLACE_CHARACTERS';
	params: {
		search: string;
		replace: string;
		columns?: string[];
	};
}

export type TransformationRule =
	| SelectWorksheetRule
	| ValidateColumnsRule
	| UnmergeAndFillRule
	| DeleteRowsRule
	| DeleteColumnsRule
	| CombineWorksheetsRule
	| EvaluateFormulasRule
	| ReplaceCharactersRule;

export interface OutputFormatConfig {
	type: OutputFormat;
	delimiter?: string;
	encoding?: string;
}

export interface Configuration {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	rules: TransformationRule[];
	outputFormat: OutputFormatConfig;
	conversionType: ConversionType;
	inputFormat: InputFormat;
	version: number;
	isActive: boolean;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
	callbackUrl?: string;
}
