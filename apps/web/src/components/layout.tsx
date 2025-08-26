import { Link, useNavigate } from '@tanstack/react-router';
import { FileText, Home, LogOut, Menu, X } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { useAuthStore, useSession } from '../stores/auth-store';

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	const { logout } = useAuthStore();
	const { data: session } = useSession();
	const navigate = useNavigate();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleLogout = async () => {
		await logout();
		navigate({ to: '/login' });
	};

	const navigationItems = [
		{ name: 'Dashboard', href: '/', icon: Home },
		{ name: 'Configurations', href: '/configurations', icon: FileText },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Navigation */}
			<nav className="border-b border-gray-200 bg-white shadow-sm">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 justify-between">
						<div className="flex">
							<div className="flex flex-shrink-0 items-center">
								<h1 className="text-xl font-semibold text-gray-900">
									Mutate Platform
								</h1>
							</div>
							<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
								{navigationItems.map((item) => {
									const Icon = item.icon;
									return (
										<Link
											key={item.name}
											to={item.href}
											className="hover:border-primary-500 hover:text-primary-600 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors"
											activeProps={{
												className: 'border-primary-500 text-primary-600',
											}}
											inactiveProps={{
												className: 'border-transparent text-gray-500',
											}}
										>
											<Icon className="mr-2 h-4 w-4" />
											{item.name}
										</Link>
									);
								})}
							</div>
						</div>

						<div className="hidden sm:ml-6 sm:flex sm:items-center">
							<div className="flex items-center space-x-4">
								<span className="text-sm text-gray-700">
									{session?.user?.email}
								</span>
								<span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
									member
								</span>
								<button
									onClick={handleLogout}
									className="btn btn-outline"
									title="Logout"
								>
									<LogOut className="h-4 w-4" />
								</button>
							</div>
						</div>

						{/* Mobile menu button */}
						<div className="flex items-center sm:hidden">
							<button
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
								className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
							>
								{isMobileMenuOpen ? (
									<X className="block h-6 w-6" />
								) : (
									<Menu className="block h-6 w-6" />
								)}
							</button>
						</div>
					</div>
				</div>

				{/* Mobile menu */}
				{isMobileMenuOpen && (
					<div className="sm:hidden">
						<div className="space-y-1 pb-3 pt-2">
							{navigationItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.name}
										to={item.href}
										className="block border-l-4 py-2 pl-3 pr-4 text-base font-medium transition-colors"
										activeProps={{
											className:
												'border-primary-500 text-primary-700 bg-primary-50',
										}}
										inactiveProps={{
											className:
												'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300',
										}}
										onClick={() => setIsMobileMenuOpen(false)}
									>
										<div className="flex items-center">
											<Icon className="mr-3 h-4 w-4" />
											{item.name}
										</div>
									</Link>
								);
							})}
						</div>
						<div className="border-t border-gray-200 pb-3 pt-4">
							<div className="px-4">
								<div className="text-sm text-gray-800">
									{session?.user?.email}
								</div>
								<div className="text-xs text-gray-500">member</div>
							</div>
							<div className="mt-3 px-4">
								<button
									onClick={handleLogout}
									className="btn btn-outline w-full justify-start"
								>
									<LogOut className="mr-2 h-4 w-4" />
									Logout
								</button>
							</div>
						</div>
					</div>
				)}
			</nav>

			{/* Main content */}
			<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{children}
			</main>
		</div>
	);
}

export function PublicLayout({ children }: LayoutProps) {
	return (
		<div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
					Mutate Platform
				</h2>
			</div>
			{children}
		</div>
	);
}
