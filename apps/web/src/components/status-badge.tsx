import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type StatusBadgeProps = {
	status: string;
	compact?: boolean;
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
	if (status === 'completed') {
		return (
			<Badge
				variant="default"
				className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
			>
				<CheckCircle2 className="mr-1 h-3 w-3" />
				{compact ? 'Done' : 'Completed'}
			</Badge>
		);
	}
	if (status === 'failed') {
		return (
			<Badge
				variant="destructive"
				className="bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
			>
				<AlertCircle className="mr-1 h-3 w-3" />
				Failed
			</Badge>
		);
	}
	if (status === 'processing') {
		return (
			<Badge
				variant="secondary"
				className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
			>
				<Loader2 className="mr-1 h-3 w-3 animate-spin" />
				{compact ? 'Running' : 'Processing'}
			</Badge>
		);
	}
	return (
		<Badge variant="secondary">
			<Clock className="mr-1 h-3 w-3" />
			Pending
		</Badge>
	);
}
