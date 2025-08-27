import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import {
	Activity,
	ArrowUpRight,
	Building,
	Clock,
	FileText,
	Plus,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { configApi } from '../api/configurations';
import { Layout } from '../components/layout';
import { CreateOrganization } from '../components/organization/create-organization';
import { ProtectedRoute } from '../components/protected-route';
import { authClient } from '../lib/auth-client';
import { useSession } from '../stores/auth-store';
import { useConfigurationStore } from '../stores/config-store';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: session } = useSession();
	const { data: organizations } = authClient.useListOrganizations();
	const { configurations, setConfigurations } = useConfigurationStore();
	const [stats, setStats] = useState({
		totalConfigurations: 0,
		activeConfigurations: 0,
		recentActivity: 0,
	});

	const hasOrganizations = (organizations || []).length > 0;

	useEffect(() => {
		const loadConfigurations = async () => {
			if (!hasOrganizations) return;

			try {
				const response = await configApi.list({ limit: 5 });
				setConfigurations(response.data);
				setStats({
					totalConfigurations: response.pagination?.total,
					activeConfigurations: response.data?.filter((c) => c.isActive)
						?.length,
					recentActivity: response.data?.filter((c) => {
						const dayAgo = new Date();
						dayAgo.setDate(dayAgo.getDate() - 1);
						return new Date(c.updatedAt) > dayAgo;
					}).length,
				});
			} catch (error) {
				console.error('Failed to load configurations:', error);
			}
		};

		loadConfigurations();
	}, [setConfigurations, hasOrganizations]);

	const statCards = [
		{
			name: 'Total Configurations',
			value: stats.totalConfigurations,
			icon: FileText,
			color: 'text-blue-600',
			bg: 'bg-blue-100',
		},
		{
			name: 'Active Configurations',
			value: stats.activeConfigurations,
			icon: Activity,
			color: 'text-green-600',
			bg: 'bg-green-100',
		},
		{
			name: 'Recent Activity',
			value: stats.recentActivity,
			icon: Clock,
			color: 'text-orange-600',
			bg: 'bg-orange-100',
		},
	];

	if (!hasOrganizations) {
		return <CreateOrganization />;
	}

	return (
		<ProtectedRoute>
			<Layout hasOrganizations={hasOrganizations}>
				<div className="space-y-6">
					{/* Header */}
					<div className="flex items-start justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
							<p className="text-gray-600">
								Welcome back, {session?.user?.email}
							</p>
						</div>
						<Link to="/configurations/new" className="">
							<Plus className="mr-2 h-4 w-4" />
							New Configuration
						</Link>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
						{statCards.map((stat) => {
							const Icon = stat.icon;
							return (
								<div key={stat.name} className="card">
									<div className="flex items-center">
										<div className={`rounded-lg p-3 ${stat.bg}`}>
											<Icon className={`h-6 w-6 ${stat.color}`} />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">
												{stat.name}
											</p>
											<p className="text-2xl font-bold text-gray-900">
												{stat.value}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* Recent Configurations */}
					<div className="card">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-gray-900">
								Recent Configurations
							</h2>
							<Link
								to="/configurations"
								className="text-primary-600 hover:text-primary-700 inline-flex items-center text-sm font-medium"
							>
								View all
								<ArrowUpRight className="ml-1 h-4 w-4" />
							</Link>
						</div>

						{configurations?.length > 0 ? (
							<div className="space-y-3">
								{configurations.slice(0, 5).map((config) => (
									<div
										key={config.id}
										className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
									>
										<div className="flex items-center space-x-3">
											<FileText className="h-5 w-5 text-gray-400" />
											<div>
												<h3 className="text-sm font-medium text-gray-900">
													{config.name}
												</h3>
												<p className="text-xs text-gray-500">
													{config.description || 'No description'}
												</p>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<span className="text-xs text-gray-500">
												v{config.version}
											</span>
											<span
												className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
													config.isActive
														? 'bg-green-100 text-green-800'
														: 'bg-gray-100 text-gray-800'
												}`}
											>
												{config.isActive ? 'Active' : 'Inactive'}
											</span>
											<Link
												to="/configurations/$configId"
												params={{ configId: config.id }}
												className="btn btn-outline px-2 py-1 text-xs"
											>
												Edit
											</Link>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="py-8 text-center">
								<FileText className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-medium text-gray-900">
									No configurations
								</h3>
								<p className="mt-1 text-sm text-gray-500">
									Get started by creating your first transformation
									configuration.
								</p>
								<div className="mt-4">
									<Link to="/configurations/new" className="">
										<Button>
											<Plus className="mr-2 h-4 w-4" />
											Create Configuration
										</Button>
									</Link>
								</div>
							</div>
						)}
					</div>

					{/* Quick Actions */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="card">
							<h3 className="mb-3 text-lg font-semibold text-gray-900">
								Quick Actions
							</h3>
							<div className="space-y-2">
								<Link
									to="/configurations/new"
									className="flex items-center rounded-lg p-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
								>
									<Plus className="mr-3 h-5 w-5 text-gray-400" />
									Create new configuration
								</Link>
								<Link
									to="/configurations"
									className="flex items-center rounded-lg p-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
								>
									<FileText className="mr-3 h-5 w-5 text-gray-400" />
									Browse all configurations
								</Link>
							</div>
						</div>

						<div className="card">
							<h3 className="mb-3 text-lg font-semibold text-gray-900">
								Organization
							</h3>
							<div className="space-y-3">
								{organizations && organizations[0] && (
									<>
										<div className="flex items-center text-sm">
											<Building className="mr-3 h-5 w-5 text-gray-400" />
											<span className="text-gray-700">
												{organizations[0].name}
											</span>
										</div>
										<div className="flex items-center text-sm">
											<span className="bg-primary-100 text-primary-800 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
												member
											</span>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</Layout>
		</ProtectedRoute>
	);
}
