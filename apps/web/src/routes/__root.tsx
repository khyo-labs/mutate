import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { Toaster } from '@/components/ui/sonner';

export const Route = createRootRoute({
	component: () => (
		<>
			<Outlet />
			{import.meta.env.DEV && (
				<TanStackRouterDevtools position="bottom-right" />
			)}
			<Toaster />
		</>
	),
});
