import { createFileRoute, redirect } from '@tanstack/react-router';

import { PublicLayout } from '../components/layouts';
import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/check-email')({
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (session) {
			throw redirect({
				to: '/',
			});
		}
	},
	component: CheckEmailComponent,
});

export function CheckEmailComponent() {
	return (
		<PublicLayout>
			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-card rounded-lg border p-6 text-center shadow-sm">
					<h2 className="text-2xl font-bold">Check your email</h2>
					<p className="mt-4 text-gray-600">
						We've sent a link to your email address. Please check your inbox and
						follow the instructions.
					</p>
				</div>
			</div>
		</PublicLayout>
	);
}
