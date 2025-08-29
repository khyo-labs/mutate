import { createFileRoute } from '@tanstack/react-router';

import { Dashboard } from '@/components/dashboard';
import { Layout } from '@/components/layouts';

import { CreateOrganization } from '../components/organization/create-organization';
import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: organizations } = authClient.useListOrganizations();

	const hasOrganizations = (organizations || []).length > 0;

	if (!hasOrganizations) {
		return <CreateOrganization />;
	}

	return (
		<Layout>
			<Dashboard />
		</Layout>
	);
}
