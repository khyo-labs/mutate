import { type UseMutationResult } from '@tanstack/react-query';
import {
	Check,
	CircleSmall,
	Clock,
	Copy,
	Edit,
	Eye,
	EyeOff,
	Globe,
	Key,
	Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { Webhook } from '@/types';
import { formatRelativeTime } from '@/utils/dates';

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
import { WebhookDrawer } from './webhook-drawer';

type Props = {
	webhook: Webhook;
	deleteWebhook: UseMutationResult<any, Error, string, unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export function WebhookDetails({ webhook, deleteWebhook }: Props) {
	const [showSecret, setShowSecret] = useState<boolean>(false);
	const [copied, setCopied] = useState(false);

	function copyToClipboard() {
		const text = webhook.secret || '';
		navigator.clipboard.writeText(text);
		setCopied(true);
		toast.success('Copied to clipboard');
		setTimeout(() => setCopied(false), 2000);
	}

	function toggleSecret() {
		setShowSecret((prev) => !prev);
	}

	const isActive =
		webhook.lastUsedAt &&
		new Date(webhook.lastUsedAt) >
			new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	return (
		<div className="overflow-hidden py-4 pb-0 transition-all">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div>
						<div className="mt-1 flex items-center gap-2">
							<h3 className="text-foreground text-lg font-semibold">
								{webhook.name}
							</h3>
							<Badge
								className={cn(
									'flex items-center gap-1',
									isActive
										? 'bg-green-500/10 text-green-600'
										: 'bg-muted text-muted-foreground',
								)}
							>
								<CircleSmall className="size-3 fill-current" />
								{isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
						<span className="text-muted-foreground text-xs">
							ID: {webhook.id}
						</span>
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
								<DrawerTitle>Edit webhook</DrawerTitle>
								<DrawerDescription className="sr-only">
									Drawer for editing a webhook
								</DrawerDescription>
							</DrawerHeader>
							<WebhookDrawer webhook={webhook} />
						</DrawerContent>
					</Drawer>

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={deleteWebhook.isPending}
								className="text-destructive hover:bg-destructive/10"
							>
								<Trash2 className="h-4 w-4" />
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Webhook</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete the webhook "{webhook.name}"?
									This will stop all notifications to {webhook.url}. This action
									cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => deleteWebhook.mutate(webhook.id)}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="space-y-4 py-4 last:pb-0">
				{webhook.url && (
					<div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
						<Globe className="text-muted-foreground mt-0.5 h-4 w-4" />
						<div className="min-w-0 flex-1">
							<p className="text-muted-foreground mb-1 text-xs font-medium">
								Endpoint URL
							</p>
							<div className="flex items-center gap-2">
								<p className="text-foreground truncate font-mono text-sm">
									{webhook.url}
								</p>
							</div>
						</div>
					</div>
				)}

				<div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
					<Key className="text-muted-foreground mt-0.5 h-4 w-4" />
					<div className="flex-1">
						<p className="text-muted-foreground mb-1 text-xs font-medium">
							Webhook Secret
						</p>
						{webhook.secret && (
							<div className="flex items-center gap-2">
								<p className="text-foreground font-mono text-sm">
									{showSecret ? webhook.secret : '••••••••••••••••'}
								</p>
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleSecret}
									title={showSecret ? 'Hide secret' : 'Show secret'}
								>
									{showSecret ? (
										<EyeOff className="text-muted-foreground h-3 w-3" />
									) : (
										<Eye className="text-muted-foreground h-3 w-3" />
									)}
								</Button>
								{showSecret && (
									<Button
										onClick={copyToClipboard}
										size="icon"
										variant="ghost"
										title="Copy to clipboard"
										className="relative"
									>
										<Copy
											className={`text-muted-foreground h-3 w-3 transition-all duration-200 ${
												copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
											}`}
										/>
										<Check
											className={`absolute inset-0 m-auto h-3 w-3 text-green-500 transition-all duration-200 ${
												copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
											}`}
										/>
									</Button>
								)}
							</div>
						)}

						{!webhook.secret && (
							<p className="text-muted-foreground text-sm italic">
								No secret configured
							</p>
						)}
					</div>
				</div>

				<div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
					<Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium">
							Last Sent
						</p>
						<p className="text-foreground text-sm">
							{formatRelativeTime(webhook.lastUsedAt)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
