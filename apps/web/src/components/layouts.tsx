import React from 'react';

import { useSession } from '@/stores/auth-store';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';
import { VerificationBanner } from './verification-banner';

type LayoutProps = {
	title?: string;
	description?: string;
	buttons?: React.ReactNode[];
	children: React.ReactNode;
};

export function Layout({ title, description, buttons, children }: LayoutProps) {
	const { data: session } = useSession();
	const showBanner = !session?.user?.emailVerified;

	return (
		<ProtectedRoute>
			<div className="bg-background flex h-screen flex-col">
				{showBanner && <VerificationBanner />}

				<div className="flex overflow-auto pt-10 lg:pt-0">
					<Sidebar />
					<main className="mx-auto flex flex-1 flex-col overflow-auto">
						<div className="bg-background mt-16 p-8 pb-0 lg:mt-0">
							<div className="flex flex-col items-start">
								<div className="flex w-full items-center justify-between">
									{title && (
										<h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
											{title}
										</h1>
									)}
									{buttons &&
										buttons.map((button, index) => (
											<React.Fragment key={index}>{button}</React.Fragment>
										))}
								</div>
								{description && (
									<p className="text-muted-foreground text-sm">{description}</p>
								)}
							</div>
						</div>
						<div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
							{children}
						</div>
					</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}

export function PublicLayout({ children }: LayoutProps) {
	return (
		<div className="bg-background gradient-mesh relative flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="absolute inset-0 grid-pattern pointer-events-none" />
			<div className="relative sm:mx-auto sm:w-full sm:max-w-md">
				<div className="mb-8 flex items-center justify-center gap-3">
					<div className="glow-primary flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-white shadow-lg shadow-amber-500/30">
						M
					</div>
					<h2 className="font-display text-foreground text-3xl font-bold tracking-tight">
						mutate
					</h2>
				</div>
			</div>
			<div className="relative">{children}</div>
		</div>
	);
}
