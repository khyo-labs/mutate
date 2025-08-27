import {
	Outlet,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { ConfigurationBuilderPage } from './pages/configuration-builder';
import { ConfigurationDetailPage } from './pages/configuration-detail';
import { ConfigurationsPage } from './pages/configurations';
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';
import { NewConfigurationPage } from './pages/new-configuration';
import { RegisterPage } from './pages/register';

// Removed auth-related imports as we'll handle auth at component level

function RootComponent() {
	return (
		<>
			<Outlet />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</>
	);
}

const rootRoute = createRootRoute({
	component: RootComponent,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	component: LoginPage,
});

const registerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/register',
	component: RegisterPage,
});

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: DashboardPage,
});

const configurationsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations',
	component: ConfigurationsPage,
});

const configurationDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations/$configId',
	component: ConfigurationDetailPage,
});

const configurationBuilderRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations/$configId/builder',
	component: ConfigurationBuilderPage,
});

const newConfigurationRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations/new',
	component: NewConfigurationPage,
});

// Create route tree
const routeTree = rootRoute.addChildren([
	loginRoute,
	registerRoute,
	dashboardRoute,
	configurationsRoute,
	configurationDetailRoute,
	configurationBuilderRoute,
	newConfigurationRoute,
]);

// Create router
export const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
});

// Register router for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
