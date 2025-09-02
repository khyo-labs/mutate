import { createFileRoute, redirect } from '@tanstack/react-router';

import { CreateWorkspace } from '@/components/workspace/create-workspace';

import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/join')({
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (session) {
			throw redirect({
				to: '/',
			});
		}
	},
	component: CreateWorkspace,
});
