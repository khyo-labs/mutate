import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Edit, Calendar, User, FileText, Eye, Code, Copy, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Layout } from '../components/layout';
import { useConfigurationStore } from '../stores/config-store';

export function ConfigurationDetailPage() {
	const { configId } = useParams({ from: '/configurations/$configId' });
	const navigate = useNavigate();
	const { fetchConfiguration, currentConfiguration, isLoading, error } = useConfigurationStore();
	const [showJson, setShowJson] = useState(false);

	useEffect(() => {
		if (configId) {
			fetchConfiguration(configId);
		}
	}, [configId, fetchConfiguration]);

	const config = currentConfiguration;

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function handleCopyJson() {
		if (config) {
			const configJson = JSON.stringify({
				name: config.name,
				description: config.description,
				rules: config.rules,
				outputFormat: config.outputFormat,
			}, null, 2);
			navigator.clipboard.writeText(configJson);
		}
	}

	function handleDownloadJson() {
		if (config) {
			const configJson = JSON.stringify({
				name: config.name,
				description: config.description,
				rules: config.rules,
				outputFormat: config.outputFormat,
			}, null, 2);
			const blob = new Blob([configJson], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${config.name}.json`;
			link.click();
			URL.revokeObjectURL(url);
		}
	}

	function getRuleTypeLabel(ruleType: string) {
		return ruleType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
	}

	if (isLoading) {
		return (
			<Layout>
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
						<p className="mt-4 text-gray-600">Loading configuration...</p>
					</div>
				</div>
			</Layout>
		);
	}

	if (error) {
		return (
			<Layout>
				<div className="rounded-md bg-red-50 p-4">
					<div className="text-sm text-red-700">{error}</div>
				</div>
			</Layout>
		);
	}

	if (!config) {
		return (
			<Layout>
				<div className="text-center py-12">
					<h2 className="text-xl font-semibold text-gray-900">Configuration not found</h2>
					<p className="mt-2 text-gray-600">The configuration you're looking for doesn't exist.</p>
					<Link to="/configurations" className="mt-4 inline-block btn btn-primary">
						Back to Configurations
					</Link>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center space-x-4 mb-4">
						<button
							onClick={() => navigate({ to: '/configurations' })}
							className="flex items-center text-gray-600 hover:text-gray-900"
						>
							<ArrowLeft className="h-4 w-4 mr-1" />
							Back to Configurations
						</button>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
							{config.description && (
								<p className="mt-2 text-lg text-gray-600">{config.description}</p>
							)}
							<div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
								<div className="flex items-center">
									<Calendar className="h-4 w-4 mr-1" />
									Created {formatDate(config.createdAt)}
								</div>
								<div className="flex items-center">
									<Calendar className="h-4 w-4 mr-1" />
									Updated {formatDate(config.updatedAt)}
								</div>
								<div className="flex items-center">
									<User className="h-4 w-4 mr-1" />
									Version {config.version}
								</div>
								<div className="flex items-center">
									<FileText className="h-4 w-4 mr-1" />
									{config.rules.length} rules
								</div>
							</div>
						</div>

						<div className="mt-6 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
							<Link
								to="/configurations/$configId/builder"
								params={{ configId: config.id }}
								className="btn btn-primary"
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit Configuration
							</Link>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* Configuration Details */}
					<div className="space-y-6">
						{/* Rules List */}
						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<h2 className="text-lg font-medium text-gray-900 mb-4">Transformation Rules</h2>
							{config.rules.length > 0 ? (
								<div className="space-y-3">
									{config.rules.map((rule, index) => (
										<div
											key={rule.id}
											className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
										>
											<div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
												{index + 1}
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="text-sm font-medium text-gray-900">
													{getRuleTypeLabel(rule.type)}
												</h3>
												<p className="text-xs text-gray-500 mt-1">
													{JSON.stringify(rule.params, null, 2)}
												</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-500 text-center py-4">No rules configured</p>
							)}
						</div>

						{/* Output Format */}
						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<h2 className="text-lg font-medium text-gray-900 mb-4">Output Format</h2>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-600">Format:</span>
									<span className="font-medium">{config.outputFormat.type}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Delimiter:</span>
									<span className="font-mono">{config.outputFormat.delimiter}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Encoding:</span>
									<span className="font-medium">{config.outputFormat.encoding}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Include Headers:</span>
									<span className="font-medium">
										{config.outputFormat.includeHeaders ? 'Yes' : 'No'}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* JSON Preview */}
					<div className="bg-white rounded-lg border border-gray-200">
						<div className="p-4 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-medium text-gray-900">JSON Configuration</h2>
								<div className="flex items-center space-x-2">
									<button
										onClick={() => setShowJson(!showJson)}
										className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
											showJson 
												? 'bg-blue-100 text-blue-700' 
												: 'bg-gray-100 text-gray-600'
										}`}
									>
										{showJson ? <Eye className="mr-1 h-3 w-3" /> : <Code className="mr-1 h-3 w-3" />}
										{showJson ? 'Hide' : 'Show'} JSON
									</button>
									<button
										onClick={handleCopyJson}
										className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
									>
										<Copy className="mr-1 h-3 w-3" />
										Copy
									</button>
									<button
										onClick={handleDownloadJson}
										className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
									>
										<Download className="mr-1 h-3 w-3" />
										Download
									</button>
								</div>
							</div>
						</div>

						{showJson && (
							<div className="p-4">
								<pre className="whitespace-pre-wrap font-mono text-xs text-gray-800 bg-gray-50 rounded p-3 max-h-96 overflow-auto">
									{JSON.stringify({
										name: config.name,
										description: config.description,
										rules: config.rules,
										outputFormat: config.outputFormat,
									}, null, 2)}
								</pre>
							</div>
						)}
					</div>
				</div>
			</div>
		</Layout>
	);
}