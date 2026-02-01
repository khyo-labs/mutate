import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { Toaster } from '@/components/ui/sonner';
import { WorkspaceInitializer } from '@/components/workspace-initializer';

export const Route = createRootRoute({
	component: () => (
		<>
			<WorkspaceInitializer />
			<Outlet />
			{import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
			<Toaster />
		</>
	),
});
