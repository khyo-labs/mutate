import {
	AlertTriangle,
	CheckCircle,
	ChevronDown,
	Copy,
	Download,
	Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Configuration, TransformationRule } from '../types';
import { Button } from './ui/button';

interface JsonConfigPanelProps {
	name: string;
	description: string;
	rules: TransformationRule[];
	outputFormat: Configuration['outputFormat'];
	onImport: (config: {
		name: string;
		description: string;
		rules: TransformationRule[];
		outputFormat: Configuration['outputFormat'];
	}) => void;
}

interface ConfigurationJSON {
	name: string;
	description: string;
	rules: TransformationRule[];
	outputFormat: Configuration['outputFormat'];
}

export function JsonConfigPanel({
	name,
	description,
	rules,
	outputFormat,
	onImport,
}: JsonConfigPanelProps) {
	const [isCollapsed, setIsCollapsed] = useState(true);
	const [showImport, setShowImport] = useState(false);
	const [importText, setImportText] = useState('');
	const [importError, setImportError] = useState<string | null>(null);
	const [importSuccess, setImportSuccess] = useState(false);

	const configJson = useMemo(() => {
		const config: ConfigurationJSON = {
			name: name || '',
			description: description || '',
			rules,
			outputFormat,
		};
		return JSON.stringify(config, null, 2);
	}, [name, description, rules, outputFormat]);

	function handleCopy() {
		navigator.clipboard.writeText(configJson);
	}

	function handleDownload() {
		const blob = new Blob([configJson], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${name || 'configuration'}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function handleImport() {
		setImportError(null);
		setImportSuccess(false);

		if (!importText.trim()) {
			setImportError('Please paste JSON configuration data');
			return;
		}

		try {
			const parsed = JSON.parse(importText.trim()) as Record<string, unknown>;

			// Validate required fields
			if (!parsed.name || typeof parsed.name !== 'string') {
				throw new Error('Configuration must have a valid "name" field');
			}

			if (!Array.isArray(parsed.rules)) {
				throw new Error('Configuration must have a "rules" array');
			}

			if (!parsed.outputFormat || typeof parsed.outputFormat !== 'object') {
				throw new Error(
					'Configuration must have a valid "outputFormat" object',
				);
			}

			// Validate each rule has required fields
			(parsed.rules as unknown[]).forEach((rule: unknown, index: number) => {
				const r = rule as {
					id?: unknown;
					type?: unknown;
					params?: unknown;
				};
				if (!r.id || typeof r.id !== 'string') {
					throw new Error(`Rule ${index + 1} must have a valid "id" field`);
				}
				if (!r.type || typeof r.type !== 'string') {
					throw new Error(`Rule ${index + 1} must have a valid "type" field`);
				}
				if (!r.params || typeof r.params !== 'object') {
					throw new Error(
						`Rule ${index + 1} must have a valid "params" object`,
					);
				}
			});

			// Validate output format
			if ((parsed.outputFormat as { type?: string }).type !== 'CSV') {
				throw new Error('Output format type must be "CSV"');
			}

			const outputFormatObj = parsed.outputFormat as Record<string, unknown>;
			const validConfig: ConfigurationJSON = {
				name: parsed.name as string,
				description: (parsed.description as string) || '',
				rules: parsed.rules as TransformationRule[],
				outputFormat: {
					type: 'CSV',
					delimiter: (outputFormatObj.delimiter as string) || ',',
					encoding: ((outputFormatObj.encoding as string) || 'UTF-8') as 'UTF-8' | 'UTF-16' | 'ASCII',
					includeHeaders: outputFormatObj.includeHeaders !== false,
				},
			};

			onImport(validConfig);
			setImportSuccess(true);
			setImportText('');
			setTimeout(() => {
				setImportSuccess(false);
				setShowImport(false);
			}, 2000);
		} catch (error) {
			if (error instanceof SyntaxError) {
				setImportError('Invalid JSON format. Please check your JSON syntax.');
			} else {
				setImportError(
					error instanceof Error
						? error.message
						: 'Failed to import configuration',
				);
			}
		}
	}

	function handleImportCancel() {
		setShowImport(false);
		setImportText('');
		setImportError(null);
		setImportSuccess(false);
	}

	if (isCollapsed) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white">
				<Button
					variant="ghost"
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
				>
					<div>
						<p className="text-sm text-gray-500">
							Preview or import configuration as JSON
						</p>
					</div>
					<ChevronDown className="h-5 w-5 text-gray-400" />
				</Button>
			</div>
		);
	}

	if (showImport) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white">
				<div className="border-b border-gray-200 p-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-medium text-gray-900">
								Import Configuration
							</h3>
							<p className="text-sm text-gray-500">
								Paste your JSON configuration below
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsCollapsed(true)}
							className="text-gray-400 hover:text-gray-600"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</Button>
					</div>
				</div>

				<div className="p-4">
					<div className="space-y-4">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">
								JSON Configuration
							</label>
							<textarea
								value={importText}
								onChange={(e) => setImportText(e.target.value)}
								placeholder="Paste your JSON configuration here..."
								rows={12}
								className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-blue-500"
							/>
						</div>

						{importError && (
							<div className="flex items-center space-x-2 rounded-md bg-red-50 p-3">
								<AlertTriangle className="h-4 w-4 text-red-500" />
								<span className="text-sm text-red-700">{importError}</span>
							</div>
						)}

						{importSuccess && (
							<div className="flex items-center space-x-2 rounded-md bg-green-50 p-3">
								<CheckCircle className="h-4 w-4 text-green-500" />
								<span className="text-sm text-green-700">
									Configuration imported successfully!
								</span>
							</div>
						)}

						<div className="flex justify-end space-x-3">
							<Button variant="outline" onClick={handleImportCancel}>
								Cancel
							</Button>
							<Button
								onClick={handleImport}
								disabled={!importText.trim() || importSuccess}
							>
								<Upload className="mr-2 h-4 w-4" />
								Import Configuration
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			<div className="border-b border-gray-200 p-4">
				<div className="flex flex-col items-center justify-between space-y-2">
					<div>
						<p className="text-sm text-gray-500">
							{rules.length} rule{rules.length !== 1 ? 's' : ''} •{' '}
							{configJson.split('\n').length} lines
						</p>
					</div>
					<div className="flex items-center space-x-3">
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setShowImport(true)}
							className="bg-green-100 text-green-700 hover:bg-green-200"
						>
							<Upload className="mr-1 h-3 w-3" />
							Import
						</Button>
						<Button variant="secondary" size="sm" onClick={handleCopy}>
							<Copy className="mr-1 h-3 w-3" />
							Copy
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={handleDownload}
							className="bg-blue-100 text-blue-700 hover:bg-blue-200"
						>
							<Download className="mr-1 h-3 w-3" />
							Download
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsCollapsed(true)}
							className="text-gray-400 hover:text-gray-600"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</Button>
					</div>
				</div>
			</div>

			<div className="p-4">
				<div className="rounded bg-gray-50 p-3">
					<pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-gray-800">
						{configJson}
					</pre>
				</div>
			</div>
		</div>
	);
}
