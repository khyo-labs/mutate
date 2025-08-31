import React from 'react';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';

type LayoutProps = {
	children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
	return (
		<ProtectedRoute>
			<div className="bg-background flex h-screen overflow-hidden pt-10 lg:pt-0">
				<Sidebar />
				<main className="flex-1 overflow-auto">
					<div className="container mx-auto px-6 py-8">{children}</div>
				</main>
			</div>
		</ProtectedRoute>
	);
}

export function PublicLayout({ children }: LayoutProps) {
	return (
		<div className="bg-background flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<div className="mb-8 flex items-center justify-center gap-3">
					<div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-md text-lg font-bold">
						M
					</div>
					<h2 className="text-foreground text-3xl font-bold">mutate</h2>
				</div>
			</div>
			{children}
		</div>
	);
}
