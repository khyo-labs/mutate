import type { UseMutationResult } from '@tanstack/react-query';
import { CircleSmall, Clock, Edit, Trash2 } from 'lucide-react';

import type { ApiKey } from '@/api/api-keys';
import { formatRelativeTime } from '@/lib/dates';
import { cn } from '@/lib/utils';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';
import { ApiKeyDrawer } from './api-key-drawer';

type Props = {
	apiKey: ApiKey;
	deleteApiKey: UseMutationResult<unknown, Error, string, unknown>;
};

export function ApiKeyDetails({ apiKey, deleteApiKey }: Props) {
	function isExpired(expiresAt: string | null) {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}

	return (
		<div className="overflow-hidden py-4 pb-0 transition-all">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-foreground text-lg font-semibold">{apiKey.name}</h3>
							<Badge
								className={cn(
									'flex items-center gap-1',
									!isExpired(apiKey.expiresAt)
										? 'bg-green-500/10 text-green-600'
										: 'bg-destructive/10 text-destructive',
								)}
							>
								<CircleSmall className="size-3 fill-current" />
								{!isExpired(apiKey.expiresAt) ? 'Active' : 'Expired'}
							</Badge>
						</div>
						<span className="text-muted-foreground text-xs">ID: {apiKey.id}</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Drawer direction="right">
						<DrawerTrigger asChild>
							<Button variant="outline" size="sm">
								<Edit className="size-4" />
								Edit
							</Button>
						</DrawerTrigger>
						<DrawerContent>
							<DrawerHeader>
								<DrawerTitle>Edit API key</DrawerTitle>
								<DrawerDescription className="sr-only">
									Drawer for editing an API key
								</DrawerDescription>
							</DrawerHeader>
							<ApiKeyDrawer apiKey={apiKey} />
						</DrawerContent>
					</Drawer>

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={deleteApiKey.isPending}
								className="text-destructive hover:bg-destructive/10"
							>
								<Trash2 className="h-4 w-4" />
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete API Key</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete the API key "{apiKey.name}"? This action cannot be
									undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => deleteApiKey.mutate(apiKey.id)}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="bg-muted/50 rounded-lg p-3">
					<div className="flex items-start gap-2">
						<Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
						<div>
							<p className="text-muted-foreground text-xs font-medium">Created</p>
							<p className="text-foreground text-sm">{formatRelativeTime(apiKey.createdAt)}</p>
						</div>
					</div>
				</div>

				<div className="bg-muted/50 rounded-lg p-3">
					<div className="flex items-start gap-2">
						<Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
						<div>
							<p className="text-muted-foreground text-xs font-medium">Last Used</p>
							<p className="text-foreground text-sm">{formatRelativeTime(apiKey.lastUsedAt)}</p>
						</div>
					</div>
				</div>

				{apiKey.expiresAt && (
					<div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
						<Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
						<div>
							<p className="text-muted-foreground mb-1 text-xs font-medium">Expires</p>
							<p className="text-foreground text-sm">{formatRelativeTime(apiKey.expiresAt)}</p>
						</div>
					</div>
				)}
			</div>

			<div className="mt-3">
				<div className="bg-muted/50 rounded-lg p-3">
					<p className="text-muted-foreground mb-2 text-xs font-medium">API Key (Masked)</p>
					<div className="flex items-center gap-2">
						<code className="bg-background flex-1 rounded border p-2 font-mono text-sm">
							mt_{'•'.repeat(32)}
						</code>
					</div>
					<p className="text-muted-foreground mt-2 text-xs">
						Permissions: {apiKey.permissions.join(', ')}
					</p>
				</div>
			</div>
		</div>
	);
}
