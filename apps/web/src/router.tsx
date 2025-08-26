import {
	Outlet,
	createRootRoute,
	createRoute,
	createRouter,
	redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { ConfigurationBuilderPage } from './pages/configuration-builder-page';
import { ConfigurationDetailPage } from './pages/configuration-detail-page';
import { ConfigurationsPage } from './pages/configurations-page';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { NewConfigurationPage } from './pages/new-configuration-page';
import { RegisterPage } from './pages/register-page';

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
