export class AppError extends Error {
	constructor(
		public code: string,
		message: string,
	) {
		super(message);
		this.name = 'AppError';
	}
}

export function getErrorMessage(error: unknown, defaultMessage: string) {
	if (error instanceof AppError) {
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return defaultMessage;
}
