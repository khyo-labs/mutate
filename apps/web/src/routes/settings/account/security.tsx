import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/settings/account/security')({
	component: SecurityPage,
});

type Passkey = {
	id: string;
	name: string | null;
	deviceType: string;
	createdAt: string;
};

function SecurityPage() {
	const [passkeys, setPasskeys] = useState<Passkey[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddDialogOpen, setAddDialogOpen] = useState(false);
	const [newPasskeyName, setNewPasskeyName] = useState('');

	async function loadPasskeys() {
		setIsLoading(true);
		const { data, error } = await authClient.passkey.listUserPasskeys();
		if (error) {
			toast.error('Failed to load passkeys', { description: error.message });
		} else if (data) {
			setPasskeys(data as Passkey[]);
		}
		setIsLoading(false);
	}

	useEffect(() => {
		loadPasskeys();
	}, []);

	async function handleDelete(id: string) {
		const { error } = await authClient.passkey.deletePasskey({ id });
		if (error) {
			toast.error('Failed to delete passkey', { description: error.message });
		} else {
			toast.success('Passkey deleted successfully');
			loadPasskeys(); // Refresh the list
		}
	}

	async function handleAddPasskey() {
		const { error } = await authClient.passkey.addPasskey({
			name: newPasskeyName,
		});
		if (error) {
			toast.error('Failed to add passkey', { description: error.message });
		} else {
			toast.success('Passkey added successfully');
			setNewPasskeyName('');
			setAddDialogOpen(false);
			loadPasskeys(); // Refresh the list
		}
	}

	return (
		<div className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>Passkeys</CardTitle>
					<CardDescription>
						Manage the passkeys used for signing in to your account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p>Loading passkeys...</p>
					) : (
						<div className="space-y-4">
							<ul className="space-y-2">
								{passkeys.map((key) => (
									<li
										key={key.id}
										className="flex items-center justify-between rounded-md border p-4"
									>
										<div>
											<p className="font-medium">
												{key.name || 'Unnamed Passkey'}
											</p>
											<p className="text-sm text-muted-foreground">
												Added on {new Date(key.createdAt).toLocaleDateString()}{' '}
												- {key.deviceType}
											</p>
										</div>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => handleDelete(key.id)}
										>
											Delete
										</Button>
									</li>
								))}
							</ul>
							{passkeys.length === 0 && <p>No passkeys found.</p>}
						</div>
					)}
					<Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
						<DialogTrigger asChild>
							<Button className="mt-4">Add a new Passkey</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add a new Passkey</DialogTitle>
								<DialogDescription>
									Follow the instructions on your device to create a new
									passkey.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
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
							<DialogFooter>
								<Button onClick={handleAddPasskey}>Save</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	);
}
