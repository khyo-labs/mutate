'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import * as React from 'react';
import { toast } from 'sonner';

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
import { getErrorMessage } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { ErrorResponse } from '@/types';

export function DeleteWorkspace() {
	const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [confirmation, setConfirmation] = React.useState('');
	const [isModalOpen, setIsModalOpen] = React.useState(false);

	// Fetch all workspaces to check if this is the last one
	const { data: workspaces } = useQuery({
		queryKey: ['workspaces'],
		queryFn: workspaceApi.list,
	});

	const isLastWorkspace = workspaces?.length === 1;

	const { mutate, isPending } = useMutation({
		mutationFn: workspaceApi.delete,
		onSuccess: async () => {
			toast.success('Workspace deleted successfully.');

			// Invalidate and refetch workspaces
			await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
			const updatedWorkspaces = await workspaceApi.list();

			// Set the first available workspace as active
			if (updatedWorkspaces.length > 0) {
				const firstWorkspace = updatedWorkspaces[0];
				setActiveWorkspace(firstWorkspace);
				router.navigate({ to: '/' });
			} else {
				// This shouldn't happen due to backend check, but just in case
				router.navigate({ to: '/' });
			}

			setIsModalOpen(false);
		},
		onError: (error: unknown) => {
			// Check if it's the last workspace error
			if ((error as ErrorResponse)?.error?.code === 'LAST_WORKSPACE') {
				toast.error(
					'You cannot delete your last workspace. Please create a new workspace first.',
				);
				setIsModalOpen(false);
				// Navigate to create workspace page
				router.navigate({ to: '/join' });
			} else {
				toast.error(getErrorMessage(error));
			}
		},
	});

	const isConfirmationMatching = confirmation === activeWorkspace?.name;

	function handleDelete() {
		if (!isConfirmationMatching || !activeWorkspace) return;
		mutate(activeWorkspace.id);
	}

	return (
		<AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
			<div className="flex items-center justify-between py-4 pb-0">
				<div>
					<p className="font-semibold">Danger Zone</p>
					<p className="text-muted-foreground text-sm">
						{isLastWorkspace
							? 'You cannot delete your last workspace.'
							: 'This action is permanent and cannot be undone.'}
					</p>
				</div>
				<AlertDialogTrigger asChild>
					<Button
						variant="destructive"
						disabled={isLastWorkspace}
						title={
							isLastWorkspace ? 'Cannot delete your last workspace' : undefined
						}
					>
						Delete Workspace
					</Button>
				</AlertDialogTrigger>
			</div>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isLastWorkspace
							? 'Cannot Delete Last Workspace'
							: 'Are you absolutely sure?'}
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							{isLastWorkspace ? (
								<>
									<p>
										You cannot delete your last workspace. Please create a new
										workspace before attempting to delete this one.
									</p>
									<div className="mt-4">
										<Button
											onClick={() => {
												setIsModalOpen(false);
												router.navigate({ to: '/join' });
											}}
										>
											Create New Workspace
										</Button>
									</div>
								</>
							) : (
								<>
									This action cannot be undone. This will permanently delete the{' '}
									<strong>{activeWorkspace?.name}</strong> workspace and all
									associated data.
									<ul className="my-2 list-inside list-disc">
										<li>API keys</li>
										<li>Webhooks</li>
										<li>Configurations</li>
										<li>Members and invitations</li>
									</ul>
									Please type <strong>{activeWorkspace?.name}</strong> to
									confirm.
								</>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				{!isLastWorkspace && (
					<div className="grid gap-2">
						<Label htmlFor="workspace-name-confirmation" className="sr-only">
							Workspace name
						</Label>
						<Input
							id="workspace-name-confirmation"
							value={confirmation}
							onChange={(e) => setConfirmation(e.target.value)}
							placeholder={activeWorkspace?.name}
						/>
					</div>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					{!isLastWorkspace && (
						<AlertDialogAction asChild>
							<Button
								variant="destructive"
								disabled={!isConfirmationMatching || isPending}
								onClick={handleDelete}
							>
								{isPending ? 'Deleting...' : 'Delete Workspace'}
							</Button>
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
