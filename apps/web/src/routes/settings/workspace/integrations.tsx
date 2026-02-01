import { createFileRoute } from '@tanstack/react-router';
import {
	CheckCircle,
	ChevronRight,
	Cloud,
	Database,
	FileSpreadsheet,
	Globe,
	Link,
	Mail,
	MessageSquare,
	Shield,
	Zap,
} from 'lucide-react';

import { SettingsHeader } from '@/components/settings/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const Route = createFileRoute('/settings/workspace/integrations')({
	component: IntegrationsComponent,
});

interface Integration {
	id: string;
	name: string;
	description: string;
	icon: React.ElementType;
	category: 'storage' | 'communication' | 'analytics' | 'workflow' | 'security';
	status: 'connected' | 'available' | 'coming_soon';
	features?: string[];
}

const integrations: Integration[] = [
	{
		id: 'aws-s3',
		name: 'AWS S3',
		description: 'Store and retrieve transformed files directly from S3 buckets',
		icon: Cloud,
		category: 'storage',
		status: 'connected',
		features: ['Automatic upload', 'Direct downloads', 'Bucket management'],
	},
	{
		id: 'cloudflare-r2',
		name: 'Cloudflare R2',
		description: 'Object storage with zero egress fees',
		icon: Globe,
		category: 'storage',
		status: 'connected',
		features: ['S3 compatible', 'Global CDN', 'Cost effective'],
	},
	{
		id: 'google-sheets',
		name: 'Google Sheets',
		description: 'Export transformations directly to Google Sheets',
		icon: FileSpreadsheet,
		category: 'workflow',
		status: 'available',
		features: ['Auto-sync', 'Real-time updates', 'Collaboration'],
	},
	{
		id: 'slack',
		name: 'Slack',
		description: 'Get notifications about transformation status',
		icon: MessageSquare,
		category: 'communication',
		status: 'available',
		features: ['Status updates', 'Error alerts', 'Team notifications'],
	},
	{
		id: 'zapier',
		name: 'Zapier',
		description: 'Connect with 5000+ apps through Zapier',
		icon: Zap,
		category: 'workflow',
		status: 'available',
		features: ['Automation', 'No-code workflows', 'Custom triggers'],
	},
	{
		id: 'sendgrid',
		name: 'SendGrid',
		description: 'Send transformation results via email',
		icon: Mail,
		category: 'communication',
		status: 'available',
		features: ['Email notifications', 'Custom templates', 'Delivery tracking'],
	},
	{
		id: 'datadog',
		name: 'Datadog',
		description: 'Monitor transformation performance and errors',
		icon: Database,
		category: 'analytics',
		status: 'coming_soon',
		features: ['Performance metrics', 'Error tracking', 'Custom dashboards'],
	},
	{
		id: 'auth0',
		name: 'Auth0',
		description: 'Advanced identity and access management',
		icon: Shield,
		category: 'security',
		status: 'coming_soon',
		features: ['SSO', 'MFA', 'Role-based access'],
	},
];

function getCategoryColor(category: string) {
	switch (category) {
		case 'storage':
			return 'text-blue-600 bg-blue-50';
		case 'communication':
			return 'text-purple-600 bg-purple-50';
		case 'analytics':
			return 'text-green-600 bg-green-50';
		case 'workflow':
			return 'text-orange-600 bg-orange-50';
		case 'security':
			return 'text-red-600 bg-red-50';
		default:
			return 'text-gray-600 bg-gray-50';
	}
}

function IntegrationCard({ integration }: { integration: Integration }) {
	const Icon = integration.icon;
	const isConnected = integration.status === 'connected';
	const isComingSoon = integration.status === 'coming_soon';

	return (
		<Card className={isComingSoon ? 'opacity-60' : isConnected ? 'border-green-200' : ''}>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-lg ${getCategoryColor(integration.category)}`}
						>
							<Icon className="h-5 w-5" />
						</div>
						<div>
							<CardTitle className="text-base">{integration.name}</CardTitle>
							{isConnected && (
								<Badge variant="outline" className="mt-1 border-green-600 text-green-600">
									<CheckCircle className="mr-1 h-3 w-3" />
									Connected
								</Badge>
							)}
							{isComingSoon && (
								<Badge variant="secondary" className="mt-1">
									Coming Soon
								</Badge>
							)}
						</div>
					</div>
					{isConnected && <Switch defaultChecked className="data-[state=checked]:bg-green-600" />}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">{integration.description}</p>
				{integration.features && (
					<ul className="space-y-1">
						{integration.features.map((feature) => (
							<li key={feature} className="text-muted-foreground flex items-center text-xs">
								<CheckCircle className="mr-2 h-3 w-3 text-green-600" />
								{feature}
							</li>
						))}
					</ul>
				)}
				<Button
					className="w-full"
					variant={isConnected ? 'outline' : 'default'}
					disabled={isComingSoon}
				>
					{isConnected ? 'Manage' : isComingSoon ? 'Coming Soon' : 'Connect'}
					{!isComingSoon && <ChevronRight className="ml-2 h-4 w-4" />}
				</Button>
			</CardContent>
		</Card>
	);
}

function IntegrationsComponent() {
	const { activeWorkspace } = useWorkspaceStore();

	if (!activeWorkspace) {
		return null;
	}

	const connectedIntegrations = integrations.filter((i) => i.status === 'connected');
	const availableIntegrations = integrations.filter((i) => i.status === 'available');
	const comingSoonIntegrations = integrations.filter((i) => i.status === 'coming_soon');

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Integrations"
				description="Connect your workspace with external services and tools"
			/>

			<Card className="border-green-200 bg-green-50/50">
				<CardContent className="flex items-center justify-between py-4">
					<div className="flex items-center gap-3">
						<Link className="h-5 w-5 text-green-600" />
						<div>
							<p className="font-medium">{connectedIntegrations.length} Active Integrations</p>
							<p className="text-muted-foreground text-sm">
								Your workspace is connected to {connectedIntegrations.length} services
							</p>
						</div>
					</div>
					<Button variant="outline">View Activity</Button>
				</CardContent>
			</Card>

			{connectedIntegrations.length > 0 && (
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Connected</h3>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{connectedIntegrations.map((integration) => (
							<IntegrationCard key={integration.id} integration={integration} />
						))}
					</div>
				</div>
			)}

			{availableIntegrations.length > 0 && (
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Available Integrations</h3>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{availableIntegrations.map((integration) => (
							<IntegrationCard key={integration.id} integration={integration} />
						))}
					</div>
				</div>
			)}

			{comingSoonIntegrations.length > 0 && (
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Coming Soon</h3>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{comingSoonIntegrations.map((integration) => (
							<IntegrationCard key={integration.id} integration={integration} />
						))}
					</div>
				</div>
			)}

			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-8 text-center">
					<Zap className="text-muted-foreground mb-4 h-12 w-12" />
					<h3 className="mb-2 font-semibold">Request an Integration</h3>
					<p className="text-muted-foreground mb-4 max-w-sm text-sm">
						Don't see the integration you need? Let us know and we'll consider adding it.
					</p>
					<Button>Request Integration</Button>
				</CardContent>
			</Card>
		</div>
	);
}
