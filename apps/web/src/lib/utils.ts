import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function getInitials(name: string) {
	const splitName = name.split(' ');
	if (splitName.length > 1) {
		name = splitName.map((n) => n[0]).join('');
	}
	return name.substring(0, 2).toUpperCase();
}

export function getErrorMessage(error: unknown, defaultMessage?: string) {
	if (typeof error === 'string') {
		return error;
	}
	if (error && typeof error === 'object' && 'message' in error) {
		if (
			'response' in error &&
			error.response &&
			typeof error.response === 'object' &&
			'data' in error.response &&
			error.response.data &&
			typeof error.response.data === 'object' &&
			'error' in error.response.data &&
			error.response.data.error &&
			typeof error.response.data.error === 'object' &&
			'message' in error.response.data.error &&
			typeof error.response.data.error.message === 'string'
		) {
			return error.response.data.error.message;
		}
		return String(error.message);
	}
	return defaultMessage ?? 'An unknown error occurred.';
}
