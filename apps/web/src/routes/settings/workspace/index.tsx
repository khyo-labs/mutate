import { createFileRoute } from '@tanstack/react-router';

import { DeleteWorkspace } from '@/components/settings/delete-workspace';
import { SettingsHeader } from '@/components/settings/header';
import { WorkspaceDetailsForm } from '@/components/settings/workspace-details-form';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/settings/workspace/')({
	component: RouteComponent,
});

export function RouteComponent() {
	return (
		<div className="space-y-6">
			<SettingsHeader title="Workspace" description="Manage your workspace settings." />

			<WorkspaceDetailsForm />

			<Card className="border-destructive">
				<CardContent>
					<DeleteWorkspace />
				</CardContent>
			</Card>
		</div>
	);
}
