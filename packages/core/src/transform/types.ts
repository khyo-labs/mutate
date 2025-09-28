import type * as XLSX from 'xlsx';

export interface TransformationState {
	workbook: XLSX.WorkBook;
	selectedSheet: string | null;
	history: string[];
	metadata: {
		rowsProcessed: number;
		columnsProcessed: number;
		sheetsProcessed: number;
	};
}

export interface TransformationResult {
	success: boolean;
	csvData?: string;
	error?: string;
	executionLog: string[];
	metadata?: {
		rowCount: number;
		columnCount: number;
		processingTimeMs: number;
	};
}
