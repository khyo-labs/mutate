import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/account/profile')({
	component: ProfileComponent,
});

function ProfileComponent() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold">Profile</h1>
			</div>

			<div className="max-w-4xl space-y-6">
				<div className="rounded-lg border bg-card p-6 text-card-foreground">
					<p className="text-muted-foreground">
						Profile settings coming soon...
					</p>
				</div>
			</div>
		</div>
	);
}
