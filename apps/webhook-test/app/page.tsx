'use client';

import { Activity, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Config, WebhookData } from '@/lib/webhook-store';

export default function WebhookTestPage() {
	const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
	const [config, setConfig] = useState<Config | null>(null);
	const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
	const [isPolling, setIsPolling] = useState(true);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const lastWebhookCount = useRef(0);

	const fetchWebhooks = async () => {
		try {
			const response = await fetch('/api/webhooks');
			const data = await response.json();
			const newWebhooks = data.webhooks || [];

			// Check if we have new webhooks
			if (newWebhooks.length > 0 && newWebhooks.length > lastWebhookCount.current) {
				const newCount = newWebhooks.length - lastWebhookCount.current;
				if (lastWebhookCount.current > 0) {
					toast({
						title: 'New Webhook' + (newCount > 1 ? 's' : '') + ' Received',
						description: `${newCount} new webhook${newCount > 1 ? 's' : ''} received`,
					});
				}
			}

			lastWebhookCount.current = newWebhooks.length;
			setWebhooks(newWebhooks);
		} catch (error) {
			console.error('Error fetching webhooks:', error);
		}
	};

	const fetchConfig = async () => {
		try {
			const response = await fetch('/api/config');
			const data = await response.json();
			const configWithMap = {
				...data,
				attemptCounts: new Map(data.attemptCounts || []),
			};
			setConfig(configWithMap);
		} catch (error) {
			console.error('Error fetching config:', error);
		}
	};

	useEffect(() => {
		// Initial load
		fetchWebhooks();
		fetchConfig();

		// Set up polling
		if (isPolling) {
			pollingIntervalRef.current = setInterval(() => {
				fetchWebhooks();
			}, 2000); // Poll every 2 seconds
		}

		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}
		};
	}, [isPolling]);

	const updateConfig = async () => {
		if (!config) return;

		const configToSend = {
			...config,
			attemptCounts: Array.from(config.attemptCounts.entries()),
		};

		try {
			const response = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(configToSend),
			});

			if (response.ok) {
				toast({
					title: 'Configuration Updated',
					description: 'Your webhook configuration has been saved.',
				});
			} else {
				throw new Error('Failed to update configuration');
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to update configuration.',
				variant: 'destructive',
			});
		}
	};

	const clearWebhooks = async () => {
		try {
			const response = await fetch('/api/webhooks', {
				method: 'DELETE',
			});

			if (response.ok) {
				setWebhooks([]);
				toast({
					title: 'Webhooks Cleared',
					description: 'All webhook history has been cleared.',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to clear webhooks.',
				variant: 'destructive',
			});
		}
	};

	const copyUrl = (path: string) => {
		const url = `${window.location.origin}${path}`;
		navigator.clipboard.writeText(url);
		toast({
			title: 'Copied to clipboard',
			description: url,
		});
	};

	const getMethodColor = (method: string) => {
		switch (method) {
			case 'GET':
				return 'bg-blue-500';
			case 'POST':
				return 'bg-green-500';
			case 'PUT':
				return 'bg-yellow-500';
			case 'DELETE':
				return 'bg-red-500';
			case 'PATCH':
				return 'bg-orange-500';
			default:
				return 'bg-gray-500';
		}
	};

	if (!config) {
		return (
			<div className="container mx-auto max-w-7xl p-4">
				<div className="flex h-96 items-center justify-center">
					<div className="text-center">
						<RefreshCw className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
						<p className="text-muted-foreground mt-2">Loading configuration...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl p-4">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Webhook Test Server</h1>
					<p className="text-muted-foreground">
						Test and debug webhooks with configurable responses
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="gap-1">
						<Activity className="h-3 w-3" />
						{isPolling ? 'Live' : 'Paused'}
					</Badge>
					<Button size="sm" variant="outline" onClick={() => setIsPolling(!isPolling)}>
						{isPolling ? 'Pause' : 'Resume'}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>Webhook Endpoint</CardTitle>
							<CardDescription>Send webhooks to this URL</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2">
								<code className="bg-muted flex-1 rounded p-2 text-sm">
									{typeof window !== 'undefined'
										? `${window.location.origin}/webhook/*`
										: 'http://localhost:8085/webhook/*'}
								</code>
								<Button size="sm" variant="outline" onClick={() => copyUrl('/webhook/test')}>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Received Webhooks</CardTitle>
								<CardDescription>
									{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} received
								</CardDescription>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={() => window.location.reload()}>
									<RefreshCw className="h-4 w-4" />
								</Button>
								<Button size="sm" variant="destructive" onClick={clearWebhooks}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-[400px]">
								{webhooks.length === 0 ? (
									<div className="text-muted-foreground py-8 text-center">
										Waiting for webhooks...
									</div>
								) : (
									<div className="space-y-2">
										{webhooks.map((webhook) => (
											<div
												key={webhook.id}
												className="hover:bg-muted/50 cursor-pointer rounded-lg border p-3 transition-colors"
												onClick={() => setSelectedWebhook(webhook)}
											>
												<div className="mb-2 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<Badge className={getMethodColor(webhook.method)}>
															{webhook.method}
														</Badge>
														<code className="text-sm font-medium">{webhook.path}</code>
														{webhook.attemptCount > 1 && (
															<Badge variant="outline" className="text-xs">
																Attempt #{webhook.attemptCount}
															</Badge>
														)}
													</div>
													<span className="text-muted-foreground text-xs">
														{new Date(webhook.timestamp).toLocaleTimeString()}
													</span>
												</div>

												<div className="space-y-1">
													{webhook.jobId && (
														<div className="flex items-center gap-2 text-xs">
															<Badge variant="secondary" className="text-xs">
																Job ID: {webhook.jobId}
															</Badge>
															{webhook.status && (
																<Badge
																	variant={
																		webhook.status === 'completed'
																			? 'default'
																			: webhook.status === 'failed'
																				? 'destructive'
																				: 'secondary'
																	}
																	className="text-xs"
																>
																	{webhook.status}
																</Badge>
															)}
														</div>
													)}

													{webhook.event && (
														<div className="text-muted-foreground text-xs">
															Event: {webhook.event}
														</div>
													)}

													{webhook.hmacValid !== null && (
														<div className="flex items-center gap-1 text-xs">
															{webhook.hmacValid ? (
																<Badge variant="outline" className="text-xs text-green-600">
																	✓ HMAC Valid
																</Badge>
															) : (
																<Badge variant="outline" className="text-xs text-red-600">
																	✗ HMAC Invalid
																</Badge>
															)}
														</div>
													)}

													{webhook.processingTime && (
														<div className="text-muted-foreground text-xs">
															Processing: {webhook.processingTime}ms
														</div>
													)}

													{Object.keys(webhook.query || {}).length > 0 && (
														<div className="text-muted-foreground text-xs">
															Query params: {Object.keys(webhook.query).join(', ')}
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</ScrollArea>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Configuration</CardTitle>
							<CardDescription>Customize webhook responses</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Response Status</Label>
								<Select
									value={config.responseStatus.toString()}
									onValueChange={(v) => setConfig({ ...config, responseStatus: parseInt(v) })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="200">200 OK</SelectItem>
										<SelectItem value="201">201 Created</SelectItem>
										<SelectItem value="202">202 Accepted</SelectItem>
										<SelectItem value="204">204 No Content</SelectItem>
										<SelectItem value="400">400 Bad Request</SelectItem>
										<SelectItem value="401">401 Unauthorized</SelectItem>
										<SelectItem value="403">403 Forbidden</SelectItem>
										<SelectItem value="404">404 Not Found</SelectItem>
										<SelectItem value="429">429 Too Many Requests</SelectItem>
										<SelectItem value="500">500 Internal Server Error</SelectItem>
										<SelectItem value="502">502 Bad Gateway</SelectItem>
										<SelectItem value="503">503 Service Unavailable</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Response Delay (ms)</Label>
								<Input
									type="number"
									value={config.responseDelay}
									onChange={(e) =>
										setConfig({
											...config,
											responseDelay: parseInt(e.target.value) || 0,
										})
									}
									min="0"
									max="30000"
								/>
							</div>

							<div className="space-y-2">
								<Label>Fail After N Attempts</Label>
								<Input
									type="number"
									value={config.failAfterAttempts}
									onChange={(e) =>
										setConfig({
											...config,
											failAfterAttempts: parseInt(e.target.value) || 0,
										})
									}
									min="0"
									placeholder="0 = never fail"
								/>
							</div>

							<Separator />

							<div className="flex items-center justify-between">
								<Label htmlFor="simulate-timeout">Simulate Timeout</Label>
								<Switch
									id="simulate-timeout"
									checked={config.simulateTimeout}
									onCheckedChange={(checked) => setConfig({ ...config, simulateTimeout: checked })}
								/>
							</div>

							<div className="flex items-center justify-between">
								<Label htmlFor="verify-hmac">Verify HMAC</Label>
								<Switch
									id="verify-hmac"
									checked={config.verifyHmac}
									onCheckedChange={(checked) => setConfig({ ...config, verifyHmac: checked })}
								/>
							</div>

							{config.verifyHmac && (
								<div className="space-y-2">
									<Label>HMAC Secret</Label>
									<Input
										value={config.webhookSecret}
										onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
										placeholder="Enter HMAC secret key"
									/>
								</div>
							)}

							<div className="flex items-center justify-between">
								<Label htmlFor="custom-body">Return Custom Body</Label>
								<Switch
									id="custom-body"
									checked={config.returnCustomBody}
									onCheckedChange={(checked) => setConfig({ ...config, returnCustomBody: checked })}
								/>
							</div>

							<Button onClick={updateConfig} className="w-full">
								Save Configuration
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>

			<Dialog open={!!selectedWebhook} onOpenChange={(open) => !open && setSelectedWebhook(null)}>
				<DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{selectedWebhook && (
								<>
									<Badge className={getMethodColor(selectedWebhook.method)}>
										{selectedWebhook.method}
									</Badge>
									<span className="font-mono text-lg">{selectedWebhook.path}</span>
								</>
							)}
						</DialogTitle>
						<DialogDescription>
							{selectedWebhook && (
								<div className="mt-2 space-y-1">
									<div>ID: {selectedWebhook.id}</div>
									<div>Time: {new Date(selectedWebhook.timestamp).toLocaleString()}</div>
									{selectedWebhook.ip && <div>IP: {selectedWebhook.ip}</div>}
									{selectedWebhook.processingTime && (
										<div>Processing Time: {selectedWebhook.processingTime}ms</div>
									)}
								</div>
							)}
						</DialogDescription>
					</DialogHeader>

					{selectedWebhook && (
						<div className="flex-1 overflow-hidden">
							<div className="mb-4 space-y-4">
								{selectedWebhook.jobId && (
									<div className="flex items-center gap-2">
										<Label className="text-sm font-medium">Job Details:</Label>
										<Badge variant="outline">Job ID: {selectedWebhook.jobId}</Badge>
										{selectedWebhook.status && (
											<Badge
												variant={
													selectedWebhook.status === 'completed'
														? 'default'
														: selectedWebhook.status === 'failed'
															? 'destructive'
															: 'secondary'
												}
											>
												{selectedWebhook.status}
											</Badge>
										)}
										{selectedWebhook.uid && (
											<Badge variant="outline">UID: {selectedWebhook.uid}</Badge>
										)}
									</div>
								)}

								{selectedWebhook.event && (
									<div className="flex items-center gap-2">
										<Label className="text-sm font-medium">Event:</Label>
										<Badge variant="secondary">{selectedWebhook.event}</Badge>
									</div>
								)}

								{selectedWebhook.signature && (
									<div className="flex items-center gap-2">
										<Label className="text-sm font-medium">Signature:</Label>
										<code className="bg-muted rounded px-2 py-1 text-xs">
											{selectedWebhook.signature}
										</code>
										{selectedWebhook.hmacValid !== null && (
											<Badge
												variant="outline"
												className={selectedWebhook.hmacValid ? 'text-green-600' : 'text-red-600'}
											>
												{selectedWebhook.hmacValid ? '✓ Valid' : '✗ Invalid'}
											</Badge>
										)}
									</div>
								)}

								{selectedWebhook.attemptCount > 1 && (
									<div className="flex items-center gap-2">
										<Label className="text-sm font-medium">Attempt:</Label>
										<Badge variant="outline">#{selectedWebhook.attemptCount}</Badge>
									</div>
								)}
							</div>

							<Tabs defaultValue="body" className="flex flex-1 flex-col overflow-hidden">
								<TabsList className="grid w-full grid-cols-4">
									<TabsTrigger value="body">Body {selectedWebhook.body ? '•' : ''}</TabsTrigger>
									<TabsTrigger value="headers">
										Headers ({Object.keys(selectedWebhook.headers || {}).length})
									</TabsTrigger>
									<TabsTrigger value="query">
										Query ({Object.keys(selectedWebhook.query || {}).length})
									</TabsTrigger>
									<TabsTrigger value="raw">Raw</TabsTrigger>
								</TabsList>

								<TabsContent value="body" className="mt-4 flex-1 overflow-hidden">
									<ScrollArea className="h-[400px] w-full rounded border">
										{selectedWebhook.body ? (
											<div className="p-4">
												{typeof selectedWebhook.body === 'object' &&
												selectedWebhook.body.executionLog ? (
													<div className="space-y-4">
														<div>
															<h4 className="mb-2 text-sm font-medium">Job Information</h4>
															<div className="text-muted-foreground space-y-1 text-xs">
																<div>
																	<span className="font-medium">Job ID:</span>{' '}
																	{selectedWebhook.body.jobId}
																</div>
																<div>
																	<span className="font-medium">Status:</span>{' '}
																	{selectedWebhook.body.status}
																</div>
																<div>
																	<span className="font-medium">Configuration:</span>{' '}
																	{selectedWebhook.body.configurationId}
																</div>
																<div>
																	<span className="font-medium">Organization:</span>{' '}
																	{selectedWebhook.body.organizationId}
																</div>
																{selectedWebhook.body.originalFileName && (
																	<div>
																		<span className="font-medium">Original File:</span>{' '}
																		{selectedWebhook.body.originalFileName}
																	</div>
																)}
																{selectedWebhook.body.downloadUrl && (
																	<div className="mt-2">
																		<span className="font-medium">Download URL:</span>
																		<div className="bg-muted mt-1 rounded p-2 break-all">
																			<a
																				href={selectedWebhook.body.downloadUrl}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="text-blue-500 hover:underline"
																			>
																				{selectedWebhook.body.downloadUrl}
																			</a>
																		</div>
																	</div>
																)}
															</div>
														</div>

														<div>
															<h4 className="mb-2 text-sm font-medium">Execution Log</h4>
															<div className="max-h-[150px] space-y-1 overflow-y-auto">
																{selectedWebhook.body.executionLog.map(
																	(log: string, index: number) => (
																		<div
																			key={index}
																			className="bg-muted text-muted-foreground rounded p-2 font-mono text-xs"
																		>
																			{log}
																		</div>
																	),
																)}
															</div>
														</div>

														<div>
															<h4 className="mb-2 text-sm font-medium">Raw Body</h4>
															<pre className="bg-muted text-muted-foreground overflow-x-auto rounded p-2 text-xs">
																{JSON.stringify(selectedWebhook.body, null, 2)}
															</pre>
														</div>
													</div>
												) : (
													<pre className="text-muted-foreground text-xs">
														{typeof selectedWebhook.body === 'string'
															? selectedWebhook.body
															: JSON.stringify(selectedWebhook.body, null, 2)}
													</pre>
												)}
											</div>
										) : (
											<div className="text-muted-foreground p-4 text-center">No body content</div>
										)}
									</ScrollArea>
								</TabsContent>

								<TabsContent value="headers" className="mt-4 flex-1 overflow-hidden">
									<ScrollArea className="h-[400px] w-full rounded border">
										<div className="space-y-2 p-4">
											{Object.entries(selectedWebhook.headers || {}).map(([key, value]) => (
												<div key={key} className="flex">
													<span className="text-muted-foreground min-w-[200px] font-mono text-xs font-medium">
														{key}:
													</span>
													<span className="text-foreground ml-2 font-mono text-xs break-all">
														{value}
													</span>
												</div>
											))}
										</div>
									</ScrollArea>
								</TabsContent>

								<TabsContent value="query" className="mt-4 flex-1 overflow-hidden">
									<ScrollArea className="h-[400px] w-full rounded border">
										{Object.keys(selectedWebhook.query || {}).length > 0 ? (
											<div className="space-y-2 p-4">
												{Object.entries(selectedWebhook.query).map(([key, value]) => (
													<div key={key} className="flex">
														<span className="text-muted-foreground min-w-[150px] font-mono text-xs font-medium">
															{key}:
														</span>
														<span className="text-foreground ml-2 font-mono text-xs">{value}</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-muted-foreground p-4 text-center">
												No query parameters
											</div>
										)}
									</ScrollArea>
								</TabsContent>

								<TabsContent value="raw" className="mt-4 flex-1 overflow-hidden">
									<ScrollArea className="h-[400px] w-full rounded border">
										<pre className="text-muted-foreground p-4 text-xs">
											{JSON.stringify(selectedWebhook, null, 2)}
										</pre>
									</ScrollArea>
								</TabsContent>
							</Tabs>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
