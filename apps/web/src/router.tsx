import {
	Outlet,
	createRootRoute,
	createRoute,
	createRouter,
	redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { ConfigurationsPage } from './pages/configurations-page';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { NewConfigurationPage } from './pages/new-configuration-page';
import { RegisterPage } from './pages/register-page';
import { useAuthStore } from './stores/auth-store';

// Root route component
function RootComponent() {
	return (
		<>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	);
}

// Root route
const rootRoute = createRootRoute({
	component: RootComponent,
});

// Public routes
const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	component: LoginPage,
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (isAuthenticated) {
			throw redirect({ to: '/' });
		}
	},
});

const registerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/register',
	component: RegisterPage,
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (isAuthenticated) {
			throw redirect({ to: '/' });
		}
	},
});

// Protected routes
const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: DashboardPage,
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (!isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
});

const configurationsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations',
	component: ConfigurationsPage,
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (!isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
});

const configurationDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations/$configId',
	component: () => <div>Configuration Detail</div>, // Will be replaced
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (!isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
});

const configurationBuilderRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations/$configId/builder',
	component: () => <div>Configuration Builder</div>, // Will be replaced
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (!isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
});

const newConfigurationRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/configurations/new',
	component: NewConfigurationPage,
	beforeLoad: () => {
		const { isAuthenticated } = useAuthStore.getState();
		if (!isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
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
	// Handle auth redirects
	onRouteError: (error) => {
		if (error.message === 'Unauthorized') {
			window.location.href = '/login';
		}
	},
});

// Register router for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
