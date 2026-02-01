import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CopyIcon, DownloadIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient, useSession } from '@/lib/auth-client';
import type { SuccessResponse } from '@/types';

const twoFactorKeys = {
	all: ['twoFactor'] as const,
	status: () => [...twoFactorKeys.all, 'status'] as const,
};

export function TwoFactor() {
	const { data: session } = useSession();
	const navigate = useNavigate();
	const [qrCode, setQrCode] = useState<string>('');
	const [totpUri, setTotpUri] = useState<string>('');
	const [showBackupCodes, setShowBackupCodes] = useState(false);
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [password, setPassword] = useState('');
	const [isPasswordDrawerOpen, setPasswordDrawerOpen] = useState(false);
	const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | 'regenerate' | null>(
		null,
	);
	const [verificationCode, setVerificationCode] = useState('');
	const [showVerificationStep, setShowVerificationStep] = useState(false);
	const [isInitialSetup, setIsInitialSetup] = useState(false);
	const queryClient = useQueryClient();

	const twoFactorEnabled = session?.user?.twoFactorEnabled || false;

	const enable2FAMutation = useMutation({
		mutationFn: async (userPassword: string) => {
			const result = await api.post<SuccessResponse<{ totpURI: string; backupCodes: string[] }>>(
				'/v1/security/two-factor/enable',
				{ password: userPassword },
			);

			console.log('2FA enable response:', result.data);
			return result.data;
		},
		onSuccess: async (data) => {
			if (data) {
				const totpURI = data.totpURI;

				if (totpURI) {
					try {
						const qrDataUrl = await QRCode.toDataURL(totpURI);
						setQrCode(qrDataUrl);
						setTotpUri(totpURI);
					} catch (error) {
						console.error('Failed to generate QR code:', error);
						toast.error('Failed to generate QR code');
					}
				}
				setBackupCodes(data.backupCodes || []);
				setPassword('');
				setPasswordDrawerOpen(false);
				setShowVerificationStep(true);

				toast.info('Scan the QR code and enter verification code to complete setup');
			}
		},
		onError: (error: Error) => {
			toast.error('Failed to enable 2FA', {
				description: error.message,
			});
		},
	});

	const disable2FAMutation = useMutation({
		mutationFn: async (userPassword: string) => {
			const result = await api.post<SuccessResponse>('/v1/security/two-factor/disable', {
				password: userPassword,
			});
			return result.data;
		},
		onSuccess: () => {
			toast.success('2FA disabled successfully');
			setPassword('');
			setPasswordDrawerOpen(false);
			setPendingAction(null);
			queryClient.invalidateQueries({ queryKey: twoFactorKeys.status() });
		},
		onError: (error: Error) => {
			toast.error('Failed to disable 2FA', {
				description: error.message,
			});
		},
	});

	const verifyTotpMutation = useMutation({
		mutationFn: async (code: string) => {
			const result = await api.post<
				SuccessResponse<{
					totpURI: string;
					backupCodes: string[];
				}>
			>('/v1/security/two-factor/verify', { code });

			return result.data;
		},
		onSuccess: () => {
			toast.success('2FA has been enabled successfully!');
			setVerificationCode('');
			setShowVerificationStep(false);
			setIsInitialSetup(true); // Mark as initial setup
			setShowBackupCodes(true);

			queryClient.invalidateQueries({ queryKey: ['session'] });
			queryClient.invalidateQueries({ queryKey: twoFactorKeys.status() });
		},
		onError: (error: Error) => {
			toast.error('Invalid verification code', {
				description: error.message,
			});
		},
	});

	const regenerateBackupCodesMutation = useMutation({
		mutationFn: async (userPassword: string) => {
			const result = await api.post<SuccessResponse<{ backupCodes: string[] }>>(
				'/v1/security/two-factor/generate-backup-codes',
				{ password: userPassword },
			);

			return result.data;
		},
		onSuccess: (data) => {
			if (data?.backupCodes) {
				setBackupCodes(data.backupCodes);
				setShowBackupCodes(true);
				setPassword('');
				setPasswordDrawerOpen(false);
				toast.success('Backup codes regenerated successfully');
			}
		},
		onError: (error: Error) => {
			toast.error('Failed to regenerate backup codes', {
				description: error.message,
			});
		},
	});

	function handleEnable2FA() {
		setPendingAction('enable');
		setPasswordDrawerOpen(true);
	}

	function handleDisable2FA() {
		setPendingAction('disable');
		setPasswordDrawerOpen(true);
	}

	function handlePasswordSubmit() {
		if (password && pendingAction) {
			if (pendingAction === 'enable') {
				enable2FAMutation.mutate(password);
			} else if (pendingAction === 'disable') {
				disable2FAMutation.mutate(password);
			} else if (pendingAction === 'regenerate') {
				regenerateBackupCodesMutation.mutate(password);
			}
		}
	}

	function handleRegenerateBackupCodes() {
		setPendingAction('regenerate');
		setPasswordDrawerOpen(true);
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}

	function downloadBackupCodes() {
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `mutate-2fa-backup-codes-${timestamp}.txt`;
		const content = [
			'Mutate - Two-Factor Authentication Backup Codes',
			'================================================',
			'',
			`Generated: ${new Date().toLocaleString()}`,
			'',
			'IMPORTANT: Store these codes in a safe place!',
			'Each code can only be used once.',
			'',
			'Backup Codes:',
			'-------------',
			...backupCodes.map((code, index) => `${index + 1}. ${code}`),
			'',
			'================================================',
			'Keep these codes secure and do not share them.',
		].join('\n');

		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		toast.success('Backup codes downloaded');
	}

	async function handleBackupCodesComplete() {
		if (isInitialSetup) {
			// For initial setup, logout and redirect to login
			toast.info('Please log in again with your authenticator app');
			await authClient.signOut();
			navigate({ to: '/login' });
		} else {
			// For viewing/regenerating, just close the drawer
			setShowBackupCodes(false);
			setIsInitialSetup(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h2 className="flex items-center gap-2 text-base font-medium">
						Two-Factor Authentication (2FA)
					</h2>
					<p className="text-muted-foreground text-sm">
						Add an extra layer of security to your account
					</p>
				</div>
				{!twoFactorEnabled ? (
					<Button size="sm" onClick={handleEnable2FA}>
						Enable 2FA
					</Button>
				) : (
					<div className="flex items-center gap-2">
						<Button size="sm" variant="outline" onClick={handleRegenerateBackupCodes}>
							Regenerate Codes
						</Button>
						<Button size="sm" variant="destructive" onClick={handleDisable2FA}>
							Disable 2FA
						</Button>
					</div>
				)}
			</div>
			<Card>
				<CardHeader className="pb-4">
					<CardTitle className="text-base">Status</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm">Two-Factor Authentication</span>
						<span
							className={`text-sm font-medium ${
								twoFactorEnabled ? 'text-green-600' : 'text-muted-foreground'
							}`}
						>
							{twoFactorEnabled ? 'Enabled' : 'Disabled'}
						</span>
					</div>
					{twoFactorEnabled && (
						<Alert>
							<AlertDescription>
								Your account is protected with two-factor authentication. You'll need to enter a
								code from your authenticator app when signing in.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			{showVerificationStep && qrCode && (
				<Drawer
					open={showVerificationStep}
					onOpenChange={(open) => {
						setShowVerificationStep(open);
						if (!open) {
							// Clear everything if user cancels
							setQrCode('');
							setTotpUri('');
							setVerificationCode('');
						}
					}}
					direction="right"
				>
					<DrawerContent className="sm:max-w-lg">
						<DrawerHeader>
							<DrawerTitle>Enable Two-Factor Authentication</DrawerTitle>
							<DrawerDescription>
								Scan the QR code with your authenticator app, then enter the verification code to
								complete setup.
							</DrawerDescription>
						</DrawerHeader>
						<div className="grid max-h-[70vh] gap-4 overflow-y-auto px-4 py-4">
							<div className="space-y-4">
								<div className="flex justify-center">
									<img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
								</div>
								<div className="space-y-2">
									<Label htmlFor="manual-entry">Can't scan? Enter manually:</Label>
									<div className="flex items-center gap-2">
										<Input
											id="manual-entry"
											value={totpUri}
											readOnly
											className="font-mono text-xs"
										/>
										<Button size="sm" variant="outline" onClick={() => copyToClipboard(totpUri)}>
											<CopyIcon className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="verification-code">Enter verification code from your app:</Label>
									<Input
										id="verification-code"
										type="text"
										value={verificationCode}
										onChange={(e) => setVerificationCode(e.target.value)}
										placeholder="000000"
										maxLength={6}
										className="text-center font-mono text-lg"
										onKeyDown={(e) => {
											if (e.key === 'Enter' && verificationCode.length === 6) {
												verifyTotpMutation.mutate(verificationCode);
											}
										}}
									/>
								</div>
							</div>
						</div>
						<DrawerFooter>
							<Button
								onClick={() => verifyTotpMutation.mutate(verificationCode)}
								disabled={verificationCode.length !== 6 || verifyTotpMutation.isPending}
							>
								{verifyTotpMutation.isPending ? 'Verifying...' : 'Verify and Enable 2FA'}
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setShowVerificationStep(false);
									setQrCode('');
									setTotpUri('');
									setVerificationCode('');
								}}
							>
								Cancel
							</Button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			)}

			{showBackupCodes && backupCodes.length > 0 && (
				<Drawer
					open={showBackupCodes}
					onOpenChange={(open) => {
						setShowBackupCodes(open);
						if (!open) {
							setQrCode('');
							setTotpUri('');
							setBackupCodes([]);
						}
					}}
					direction="right"
				>
					<DrawerContent className="sm:max-w-lg">
						<DrawerHeader>
							<DrawerTitle>Save Your Backup Codes</DrawerTitle>
							<DrawerDescription>
								Store these codes in a safe place. Each code can only be used once to access your
								account if you lose your authenticator.
							</DrawerDescription>
						</DrawerHeader>
						<div className="grid max-h-[70vh] gap-4 overflow-y-auto px-4 py-4">
							<Alert>
								<AlertDescription>
									⚠️ These codes won't be shown again. Make sure to save them now!
								</AlertDescription>
							</Alert>
							<div className="grid grid-cols-2 gap-2">
								{backupCodes.map((code, index) => (
									<div key={index} className="bg-muted flex items-center gap-2 rounded-md p-2">
										<code className="flex-1 font-mono text-sm">{code}</code>
										<Button size="sm" variant="ghost" onClick={() => copyToClipboard(code)}>
											<CopyIcon className="h-3 w-3" />
										</Button>
									</div>
								))}
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => copyToClipboard(backupCodes.join('\n'))}
									className="flex-1"
								>
									<CopyIcon className="mr-2 h-4 w-4" />
									Copy All
								</Button>
								<Button variant="outline" onClick={downloadBackupCodes} className="flex-1">
									<DownloadIcon className="mr-2 h-4 w-4" />
									Download .txt
								</Button>
							</div>
						</div>
						<DrawerFooter>
							<Button onClick={handleBackupCodesComplete}>I've Saved My Codes</Button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			)}
			<Drawer open={isPasswordDrawerOpen} onOpenChange={setPasswordDrawerOpen} direction="right">
				<DrawerContent className="sm:max-w-md">
					<DrawerHeader>
						<DrawerTitle>
							{pendingAction === 'enable' && 'Enable Two-Factor Authentication'}
							{pendingAction === 'disable' && 'Disable Two-Factor Authentication'}
							{pendingAction === 'regenerate' && 'Regenerate Backup Codes'}
						</DrawerTitle>
						<DrawerDescription>Enter your password to continue with this action.</DrawerDescription>
					</DrawerHeader>
					<div className="grid gap-4 px-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
								onKeyDown={(e) => {
									if (e.key === 'Enter' && password) {
										handlePasswordSubmit();
									}
								}}
							/>
						</div>
					</div>
					<DrawerFooter>
						<Button onClick={handlePasswordSubmit} disabled={!password}>
							Continue
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								setPasswordDrawerOpen(false);
								setPassword('');
								setPendingAction(null);
							}}
						>
							Cancel
						</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
