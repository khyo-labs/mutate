import { Outlet } from '@tanstack/react-router';
import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useSession } from '@/stores/auth-store';
import type { SuccessResponse } from '@/types';

import { AdminSidebar } from './admin-sidebar';

export function AdminLayout() {
	const { data: session } = useSession();
	const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const [needs2FA, setNeeds2FA] = useState(false);

	useEffect(() => {
		checkAdminAccess();
	}, [session]);

	async function checkAdminAccess() {
		if (!session?.user) {
			setIsCheckingAdmin(false);
			return;
		}

		try {
			// Check if user is a platform admin
			const response = await api.get<
				SuccessResponse<{
					isAdmin: boolean;
					requires2FA?: boolean;
					has2FAEnabled?: boolean;
				}>
			>('/v1/admin/check-access');

			const data = response.data;

			if (data.isAdmin) {
				setIsAdmin(true);

				// Check 2FA status
				if (data.requires2FA && !data.has2FAEnabled) {
					setNeeds2FA(true);
				}
			}
		} catch (error: unknown) {
			const err = error as {
				response?: { data?: { error?: { code?: string } } };
			};
			if (err.response?.data?.error?.code === '2FA_VERIFICATION_REQUIRED') {
				setNeeds2FA(true);
				setIsAdmin(true);
			} else {
				console.error('Admin access check failed:', error);
			}
		} finally {
			setIsCheckingAdmin(false);
		}
	}

	if (isCheckingAdmin) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<Shield className="text-primary mx-auto h-12 w-12 animate-pulse" />
					<p className="text-muted-foreground mt-4 text-sm">
						Verifying admin access...
					</p>
				</div>
			</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Authentication Required</CardTitle>
						<CardDescription>
							Please log in to access the admin dashboard.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<a href="/login">Go to Login</a>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							Access Denied
						</CardTitle>
						<CardDescription>
							You do not have permission to access the admin dashboard.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-4 text-sm">
							Platform admin privileges are required to access this area.
						</p>
						<Button asChild variant="outline" className="w-full">
							<a href="/">Return to Dashboard</a>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (needs2FA) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Two-Factor Authentication Required</CardTitle>
						<CardDescription>
							Platform admin access requires 2FA for enhanced security.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-4 text-sm">
							Please enable two-factor authentication in your account settings
							to continue.
						</p>
						<div className="space-y-2">
							<Button asChild className="w-full">
								<a href="/settings/account/security">Setup 2FA</a>
							</Button>
							<Button asChild variant="outline" className="w-full">
								<a href="/">Return to Dashboard</a>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex h-screen overflow-hidden">
			<AdminSidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="bg-background border-b px-6 py-3">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold">Platform Administration</h1>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								Admin Mode
							</Badge>
						</div>
					</div>
				</header>
				<main className="bg-muted/30 flex-1 overflow-y-auto">
					<div className="container mx-auto p-6">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
