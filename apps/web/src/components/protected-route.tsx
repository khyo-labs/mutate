import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useSession } from '../stores/auth-store';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { data: session, isPending } = useSession();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isPending && !session?.user) {
			navigate({ to: '/login' });
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="border-primary-600 mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
					<p className="mt-2 text-sm text-gray-500">Loading...</p>
				</div>
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	return <>{children}</>;
}
