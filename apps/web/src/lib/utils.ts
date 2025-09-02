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
