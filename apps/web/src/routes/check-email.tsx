import { createFileRoute } from '@tanstack/react-router';

import { PublicLayout } from '../components/layouts';

export const Route = createFileRoute('/check-email')({
	component: CheckEmailComponent,
});

export function CheckEmailComponent() {
	return (
		<PublicLayout>
			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-card rounded-lg border p-6 shadow-sm text-center">
					<h2 className="text-2xl font-bold">Check your email</h2>
					<p className="mt-4 text-gray-600">
						We've sent a link to your email address. Please check your inbox
						and follow the instructions.
					</p>
				</div>
			</div>
		</PublicLayout>
	);
}
