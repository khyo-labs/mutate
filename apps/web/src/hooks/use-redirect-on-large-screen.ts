import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export function useRedirectOnLargeScreen(redirectTo: string) {
	const navigate = useNavigate();

	useEffect(() => {
		const checkScreenSize = () => {
			if (window.innerWidth >= 1280) {
				navigate({ to: redirectTo, replace: true });
			}
		};

		checkScreenSize();

		window.addEventListener('resize', checkScreenSize);
		return () => window.removeEventListener('resize', checkScreenSize);
	}, [navigate, redirectTo]);
}
