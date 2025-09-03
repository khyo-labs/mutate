'use client';

import { workspaceApi } from '@/api/workspaces';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/hooks/use-workspaces';
import { getErrorMessage } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import * as React from 'react';
import { toast } from 'sonner';

export function DeleteWorkspace() {
	const { data: workspace } = useWorkspace();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [confirmation, setConfirmation] = React.useState('');
	const [isModalOpen, setIsModalOpen] = React.useState(false);

	const { mutate, isPending } = useMutation({
		mutationFn: workspaceApi.delete,
		onSuccess: () => {
			toast.success('Workspace deleted successfully.');
			queryClient.invalidateQueries({ queryKey: ['workspaces'] });
			router.navigate({ to: '/' });
			setIsModalOpen(false);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const isConfirmationMatching = confirmation === workspace?.name;

	function handleDelete() {
		if (!isConfirmationMatching || !workspace) return;
		mutate(workspace.id);
	}

	return (
		<AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
			<div className="flex items-center justify-between rounded-md border border-input p-4">
				<div>
					<p className="font-semibold">Delete this workspace</p>
					<p className="text-muted-foreground text-sm">
						This action is permanent and cannot be undone.
					</p>
				</div>
				<AlertDialogTrigger asChild>
					<Button variant="destructive">Delete Workspace</Button>
				</AlertDialogTrigger>
			</div>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the{' '}
						<strong>{workspace?.name}</strong> workspace and all associated
						data.
						<ul className="my-2 list-inside list-disc">
							<li>API keys</li>
							<li>Webhooks</li>
							<li>Configurations</li>
							<li>Members and invitations</li>
						</ul>
						Please type <strong>{workspace?.name}</strong> to confirm.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="grid gap-2">
					<Label htmlFor="workspace-name-confirmation" className="sr-only">
						Workspace name
					</Label>
					<Input
						id="workspace-name-confirmation"
						value={confirmation}
						onChange={(e) => setConfirmation(e.target.value)}
						placeholder={workspace?.name}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={!isConfirmationMatching || isPending}
						onClick={handleDelete}
					>
						{isPending ? 'Deleting...' : 'Delete Workspace'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
