import type { Organization } from 'better-auth/plugins/organization';
import { create } from 'zustand';

import { authClient } from '@/lib/auth-client';

interface OrganizationStore {
	isLoading: boolean;
	organizations: Organization[];
	activeOrganization: Organization | null;
	setOrganizations: (organizations: Organization[]) => void;
	setActiveOrganization: (organization: Organization) => void;
	setLoading: (isLoading: boolean) => void;
}

export const useOrganizationStore = create<OrganizationStore>((set) => ({
	isLoading: false,
	organizations: [],
	activeOrganization: null,
	setOrganizations: (organizations: Organization[]) => {
		set({ organizations });
	},
	setActiveOrganization: (organization: Organization) => {
		authClient.organization.setActive({
			organizationId: organization.id,
			organizationSlug: organization.slug,
		});
		set({ activeOrganization: organization });
	},
	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},
}));
