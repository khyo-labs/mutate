import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(
	date: Date | string | null | undefined,
): string {
	if (!date) return 'Never';

	return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(dateString: string | null) {
	if (!dateString) return 'Never';
	return new Date(dateString).toLocaleDateString();
}
