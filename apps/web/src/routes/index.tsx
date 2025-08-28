import { createFileRoute } from '@tanstack/react-router';


import { CreateOrganization } from '../components/organization/create-organization';
import { authClient } from '../lib/auth-client';
import { Dashboard } from '@/components/dashboard';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: organizations } = authClient.useListOrganizations();

	const hasOrganizations = (organizations || []).length > 0;



	if (!hasOrganizations) {
		return <CreateOrganization />;
	}

	return <Dashboard />;
}
