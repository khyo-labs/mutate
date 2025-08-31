import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { Dashboard } from '@/components/dashboard';
import { Layout } from '@/components/layouts';
import { authClient } from '@/lib/auth-client';
import { useOrganizationStore } from '@/stores/organization-store';

import { CreateOrganization } from '../components/organization/create-organization';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: organizations } = authClient.useListOrganizations();
	const { setOrganizations, activeOrganization, setActiveOrganization } = useOrganizationStore();
	const hasInitialized = useRef(false);

	useEffect(() => {
		if (organizations && !hasInitialized.current) {
			setOrganizations(organizations);
			if (!activeOrganization && organizations.length > 0) {
				setActiveOrganization(organizations[0]);
			}
			hasInitialized.current = true;
		}
	}, [organizations, setOrganizations, activeOrganization, setActiveOrganization]);

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
