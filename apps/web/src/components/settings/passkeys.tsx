import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

export type Passkey = {
	id: string;
	name?: string;
	deviceType: string;
	createdAt: Date;
};

const passkeyKeys = {
	all: ['passkeys'] as const,
	list: () => [...passkeyKeys.all, 'list'] as const,
};

export function PassKeys() {
	const [isAddDrawerOpen, setAddDrawerOpen] = useState(false);
	const [newPasskeyName, setNewPasskeyName] = useState('');
	const queryClient = useQueryClient();

	const { data: passkeys = [], isLoading } = useQuery({
		queryKey: passkeyKeys.list(),
		queryFn: async () => {
			const response = await authClient.passkey.listUserPasskeys();
			if (response?.error) {
				throw new Error(response.error.message);
			}
			return response?.data || [];
		},
	});

	const deletePasskeyMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await authClient.passkey.deletePasskey({ id });
			if (response?.error) {
				throw new Error(response.error.message);
			}
			return response;
		},
		onSuccess: () => {
			toast.success('Passkey deleted successfully');
			queryClient.invalidateQueries({ queryKey: passkeyKeys.list() });
		},
		onError: (error: Error) => {
			toast.error('Failed to delete passkey', {
				description: error.message,
			});
		},
	});

	const addPasskeyMutation = useMutation({
		mutationFn: async (name: string) => {
			const response = await authClient.passkey.addPasskey({ name });
			if (response?.error) {
				throw new Error(response.error.message);
			}
			return response;
		},
		onSuccess: () => {
			toast.success('Passkey added successfully');
			setNewPasskeyName('');
			setAddDrawerOpen(false);
			queryClient.invalidateQueries({ queryKey: passkeyKeys.list() });
		},
		onError: (error: Error) => {
			toast.error('Failed to add passkey', {
				description: error.message,
			});
		},
	});

	function handleDelete(id: string) {
		deletePasskeyMutation.mutate(id);
	}

	function handleAddPasskey() {
		addPasskeyMutation.mutate(newPasskeyName);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h2 className="text-base font-medium">Passkeys</h2>
					<p className="text-muted-foreground text-sm">Add a passkey to your account</p>
				</div>
				<Drawer open={isAddDrawerOpen} onOpenChange={setAddDrawerOpen} direction="right">
					<DrawerTrigger asChild>
						<Button size="sm">Add new passkey</Button>
					</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>Add a new Passkey</DrawerTitle>
							<DrawerDescription>
								Follow the instructions on your device to create a new passkey.
							</DrawerDescription>
						</DrawerHeader>
						<div className="grid gap-4 px-4 py-4">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="name" className="text-right">
									Name
								</Label>
								<Input
									id="name"
									value={newPasskeyName}
									onChange={(e) => setNewPasskeyName(e.target.value)}
									className="col-span-3"
									placeholder="e.g. My Phone"
								/>
							</div>
						</div>
						<DrawerFooter>
							<Button onClick={handleAddPasskey}>Save</Button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			</div>
			<Card>
				<CardContent className="p-4">
					{isLoading ? (
						<p>Loading passkeys...</p>
					) : (
						<ul className="divide-border grid gap-3 divide-y">
							{passkeys.map((key: Passkey) => (
								<li key={key.id} className="flex items-center justify-between pb-3 last:pb-0">
									<div>
										<p className="font-medium">{key.name || 'Unnamed Passkey'}</p>
										<p className="text-muted-foreground text-sm">
											Added on {new Date(key.createdAt).toLocaleDateString()} - {key.deviceType}
										</p>
									</div>
									<Button variant="destructive" size="sm" onClick={() => handleDelete(key.id)}>
										Delete
									</Button>
								</li>
							))}
							{passkeys.length === 0 && <p>No passkeys found.</p>}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
