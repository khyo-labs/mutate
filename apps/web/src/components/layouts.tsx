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
										<h1 className="text-foreground text-2xl font-bold tracking-tight">
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
