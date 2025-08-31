import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/teams/')({
	beforeLoad: () => {
		throw redirect({ to: '/settings/teams/webhooks' });
	},
});
