import { createFileRoute } from '@tanstack/react-router';
import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	Database,
	Gauge,
	HardDrive,
	Loader2,
	RefreshCw,
	Server,
	TrendingDown,
	TrendingUp,
	Wifi,
	XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SuccessResponse } from '@/types';

export const Route = createFileRoute('/admin/health/')({
	component: SystemHealthMonitoring,
});

interface SystemHealth {
	status: 'healthy' | 'degraded' | 'critical';
	services: {
		api: ServiceStatus;
		database: ServiceStatus;
		redis: ServiceStatus;
		storage: ServiceStatus;
	};
	metrics: {
		cpuUsage: number;
		memoryUsage: number;
		diskUsage: number;
		activeConnections: number;
		queueSize: number;
		errorRate: number;
	};
	performance: {
		avgResponseTime: number;
		p95ResponseTime: number;
		p99ResponseTime: number;
		requestsPerSecond: number;
	};
	alerts: Alert[];
}

interface ServiceStatus {
	name: string;
	status: 'up' | 'down' | 'degraded';
	responseTime: number;
	lastCheck: string;
	message?: string;
}

interface Alert {
	id: string;
	severity: 'info' | 'warning' | 'error' | 'critical';
	message: string;
	timestamp: string;
	resolved: boolean;
}

interface MetricHistory {
	timestamp: string;
	cpuUsage: number;
	memoryUsage: number;
	responseTime: number;
	errorRate: number;
	requestCount: number;
}

function SystemHealthMonitoring() {
	const [health, setHealth] = useState<SystemHealth | null>(null);
	const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [autoRefresh] = useState(true);
	const [refreshInterval] = useState(30000); // 30 seconds

	useEffect(() => {
		fetchSystemHealth();
		fetchMetricHistory();

		if (autoRefresh) {
			const interval = setInterval(() => {
				fetchSystemHealth();
				fetchMetricHistory();
			}, refreshInterval);

			return () => clearInterval(interval);
		}
	}, [autoRefresh, refreshInterval]);

	// Fetch server-composed system health
	async function fetchSystemHealth() {
		try {
			const res = await api.get<SuccessResponse<SystemHealth>>('/v1/admin/health/status');
			setHealth(res.data);
		} catch (error) {
			console.error('Failed to fetch system health:', error);
			toast.error('Failed to load system health');
		} finally {
			setLoading(false);
		}
	}

	async function fetchMetricHistory() {
		try {
			const res = await api.get<SuccessResponse<{ metrics: MetricHistory[] }>>(
				'/v1/admin/health/metrics?period=1h',
			);
			setMetricHistory(res.data.metrics);
		} catch {
			setMetricHistory([]);
		}
	}

	async function acknowledgeAlert(alertId: string) {
		try {
			await api.post(`/v1/admin/health/alerts/${alertId}/acknowledge`);
			toast.success('Alert acknowledged');
			fetchSystemHealth();
		} catch {
			toast.error('Failed to acknowledge alert');
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'healthy':
			case 'up':
				return 'text-green-600';
			case 'degraded':
				return 'text-yellow-600';
			case 'critical':
			case 'down':
				return 'text-red-600';
			default:
				return 'text-gray-600';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'healthy':
			case 'up':
				return <CheckCircle className="h-5 w-5 text-green-600" />;
			case 'degraded':
				return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
			case 'critical':
			case 'down':
				return <XCircle className="h-5 w-5 text-red-600" />;
			default:
				return <Activity className="h-5 w-5" />;
		}
	}

	function getSeverityBadgeVariant(
		severity: string,
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (severity) {
			case 'critical':
			case 'error':
				return 'destructive';
			case 'warning':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!health) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<p className="text-muted-foreground">No health data available</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">System Health</h2>
					<p className="text-muted-foreground">Monitor platform performance and service status</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant={health.status === 'healthy' ? 'default' : 'destructive'}
						className="text-sm"
					>
						{getStatusIcon(health.status)}
						<span className="ml-1">
							{health.status.charAt(0).toUpperCase() + health.status.slice(1)}
						</span>
					</Badge>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							fetchSystemHealth();
							fetchMetricHistory();
						}}
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Service Status Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">API Service</CardTitle>
						<Server className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="flex items-center gap-2">
									{getStatusIcon(health.services.api.status)}
									<span className={getStatusColor(health.services.api.status)}>
										{health.services.api.status.toUpperCase()}
									</span>
								</div>
								<p className="text-muted-foreground text-xs">
									{health.services.api.responseTime}ms response
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Database</CardTitle>
						<Database className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="flex items-center gap-2">
									{getStatusIcon(health.services.database.status)}
									<span className={getStatusColor(health.services.database.status)}>
										{health.services.database.status.toUpperCase()}
									</span>
								</div>
								<p className="text-muted-foreground text-xs">
									{health.services.database.responseTime}ms query
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Redis Queue</CardTitle>
						<Activity className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="flex items-center gap-2">
									{getStatusIcon(health.services.redis.status)}
									<span className={getStatusColor(health.services.redis.status)}>
										{health.services.redis.status.toUpperCase()}
									</span>
								</div>
								<p className="text-muted-foreground text-xs">
									{health.metrics.queueSize} jobs in queue
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Storage</CardTitle>
						<HardDrive className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="flex items-center gap-2">
									{getStatusIcon(health.services.storage.status)}
									<span className={getStatusColor(health.services.storage.status)}>
										{health.services.storage.status.toUpperCase()}
									</span>
								</div>
								<p className="text-muted-foreground text-xs">{health.metrics.diskUsage}% used</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="metrics" className="space-y-4">
				<TabsList>
					<TabsTrigger value="metrics">System Metrics</TabsTrigger>
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="alerts">
						Alerts
						{health.alerts.filter((a) => !a.resolved).length > 0 && (
							<Badge variant="destructive" className="ml-2 text-xs">
								{health.alerts.filter((a) => !a.resolved).length}
							</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="metrics" className="space-y-4">
					{/* Resource Usage */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">CPU Usage</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-2xl font-bold">{health.metrics.cpuUsage}%</span>
										{health.metrics.cpuUsage > 80 ? (
											<TrendingUp className="h-4 w-4 text-red-600" />
										) : (
											<TrendingDown className="h-4 w-4 text-green-600" />
										)}
									</div>
									<Progress value={health.metrics.cpuUsage} />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Memory Usage</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-2xl font-bold">{health.metrics.memoryUsage}%</span>
										{health.metrics.memoryUsage > 80 ? (
											<TrendingUp className="h-4 w-4 text-red-600" />
										) : (
											<TrendingDown className="h-4 w-4 text-green-600" />
										)}
									</div>
									<Progress value={health.metrics.memoryUsage} />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Disk Usage</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-2xl font-bold">{health.metrics.diskUsage}%</span>
										{health.metrics.diskUsage > 80 ? (
											<TrendingUp className="h-4 w-4 text-red-600" />
										) : (
											<TrendingDown className="h-4 w-4 text-green-600" />
										)}
									</div>
									<Progress value={health.metrics.diskUsage} />
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Metric History Chart */}
					<Card>
						<CardHeader>
							<CardTitle>System Metrics History</CardTitle>
							<CardDescription>Last hour of system metrics</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={metricHistory}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis
										dataKey="timestamp"
										tickFormatter={(value) =>
											new Date(value).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})
										}
									/>
									<YAxis />
									<Tooltip labelFormatter={(value) => new Date(value).toLocaleTimeString()} />
									<Line type="monotone" dataKey="cpuUsage" stroke="#8884d8" name="CPU %" />
									<Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" name="Memory %" />
									<Line type="monotone" dataKey="errorRate" stroke="#ffc658" name="Error Rate" />
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="performance" className="space-y-4">
					{/* Performance Metrics */}
					<div className="grid gap-4 md:grid-cols-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
								<Clock className="text-muted-foreground h-4 w-4" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{health.performance.avgResponseTime}ms</div>
								<p className="text-muted-foreground text-xs">Average latency</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">P95 Response Time</CardTitle>
								<Gauge className="text-muted-foreground h-4 w-4" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{health.performance.p95ResponseTime}ms</div>
								<p className="text-muted-foreground text-xs">95th percentile</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">P99 Response Time</CardTitle>
								<Gauge className="text-muted-foreground h-4 w-4" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{health.performance.p99ResponseTime}ms</div>
								<p className="text-muted-foreground text-xs">99th percentile</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Requests/sec</CardTitle>
								<Wifi className="text-muted-foreground h-4 w-4" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{health.performance.requestsPerSecond}</div>
								<p className="text-muted-foreground text-xs">Current load</p>
							</CardContent>
						</Card>
					</div>

					{/* Response Time Distribution */}
					<Card>
						<CardHeader>
							<CardTitle>Response Time Distribution</CardTitle>
							<CardDescription>API response times over time</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<AreaChart data={metricHistory}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis
										dataKey="timestamp"
										tickFormatter={(value) =>
											new Date(value).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})
										}
									/>
									<YAxis />
									<Tooltip labelFormatter={(value) => new Date(value).toLocaleTimeString()} />
									<Area
										type="monotone"
										dataKey="responseTime"
										stroke="#8884d8"
										fill="#8884d8"
										fillOpacity={0.6}
										name="Response Time (ms)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="alerts" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Active Alerts</CardTitle>
							<CardDescription>
								System alerts and notifications that require attention
							</CardDescription>
						</CardHeader>
						<CardContent>
							{health.alerts.length === 0 ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-center">
										<CheckCircle className="mx-auto h-12 w-12 text-green-600" />
										<p className="text-muted-foreground mt-2 text-sm">No active alerts</p>
									</div>
								</div>
							) : (
								<div className="space-y-2">
									{health.alerts
										.filter((alert) => !alert.resolved)
										.map((alert) => (
											<div
												key={alert.id}
												className="flex items-start justify-between rounded-lg border p-4"
											>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<Badge variant={getSeverityBadgeVariant(alert.severity)}>
															{alert.severity.toUpperCase()}
														</Badge>
														<span className="text-muted-foreground text-xs">
															{new Date(alert.timestamp).toLocaleString()}
														</span>
													</div>
													<p className="mt-2 text-sm">{alert.message}</p>
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() => acknowledgeAlert(alert.id)}
												>
													Acknowledge
												</Button>
											</div>
										))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
