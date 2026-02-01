export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getRuleTypeLabel(ruleType: string): string {
	return ruleType
		.replace(/_/g, ' ')
		.toLowerCase()
		.replace(/\b\w/g, (l) => l.toUpperCase());
}

const MUTATION_TYPE_DISPLAY: Record<string, string> = {
	XLSX_TO_CSV: 'XLSX → CSV',
	DOCX_TO_PDF: 'DOCX → PDF',
	HTML_TO_PDF: 'HTML → PDF',
	PDF_TO_CSV: 'PDF → CSV',
	JSON_TO_CSV: 'JSON → CSV',
	CSV_TO_JSON: 'CSV → JSON',
};

export function formatConversionType(conversionType: string | undefined | null): string {
	if (!conversionType) return 'XLSX → CSV';
	return MUTATION_TYPE_DISPLAY[conversionType] ?? conversionType.replace(/_TO_/g, ' → ');
}
