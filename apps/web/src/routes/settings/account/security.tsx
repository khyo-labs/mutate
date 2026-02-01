import { createFileRoute } from '@tanstack/react-router';

import { SettingsHeader } from '@/components/settings/header';
import { PassKeys } from '@/components/settings/passkeys';
import { TwoFactor } from '@/components/settings/two-factor';

export const Route = createFileRoute('/settings/account/security')({
	component: SecurityPage,
});

function SecurityPage() {
	return (
		<div className="space-y-8">
			<SettingsHeader title="Security" description="Manage your account security settings." />

			<PassKeys />
			<TwoFactor />
		</div>
	);
}
