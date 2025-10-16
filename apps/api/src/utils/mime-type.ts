const MIME_TYPE_MAP: Record<string, string[]> = {
	xlsx: [
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/vnd.ms-excel',
	],
	json: ['application/json', 'text/json'],
	csv: ['text/csv', 'text/plain'],
	pdf: ['application/pdf'],
	xml: ['application/xml', 'text/xml'],
};

export function getMimeTypes(fileType: string): string[] {
	return MIME_TYPE_MAP[fileType.toLowerCase()] || [];
}

export function getFileExtension(mimeType: string): string | null {
	for (const [ext, mimes] of Object.entries(MIME_TYPE_MAP)) {
		if (mimes.includes(mimeType.toLowerCase())) {
			return ext;
		}
	}
	return null;
}

export function validateMimeType(
	mimeType: string,
	expectedType: string,
): boolean {
	const validMimeTypes = getMimeTypes(expectedType);
	return validMimeTypes.some((valid) =>
		mimeType.toLowerCase().includes(valid.toLowerCase()),
	);
}

export function getOutputMimeType(outputFormat: string): string {
	const mimeTypes = getMimeTypes(outputFormat);
	return mimeTypes[0] || 'application/octet-stream';
}

export function getOutputFileExtension(outputFormat: string): string {
	return outputFormat.toLowerCase();
}
