import { ChevronDown, Copy, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';

import type { TransformationRule, Configuration } from '../types';

interface JsonConfigPanelProps {
	name: string;
	description: string;
	rules: TransformationRule[];
	outputFormat: Configuration['outputFormat'];
	onImport: (config: { name: string; description: string; rules: TransformationRule[]; outputFormat: Configuration['outputFormat'] }) => void;
}

interface ConfigurationJSON {
	name: string;
	description: string;
	rules: TransformationRule[];
	outputFormat: Configuration['outputFormat'];
}

export function JsonConfigPanel({ name, description, rules, outputFormat, onImport }: JsonConfigPanelProps) {
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
			const parsed = JSON.parse(importText.trim());
			
			// Validate required fields
			if (!parsed.name || typeof parsed.name !== 'string') {
				throw new Error('Configuration must have a valid "name" field');
			}

			if (!Array.isArray(parsed.rules)) {
				throw new Error('Configuration must have a "rules" array');
			}

			if (!parsed.outputFormat || typeof parsed.outputFormat !== 'object') {
				throw new Error('Configuration must have a valid "outputFormat" object');
			}

			// Validate each rule has required fields
			parsed.rules.forEach((rule: any, index: number) => {
				if (!rule.id || typeof rule.id !== 'string') {
					throw new Error(`Rule ${index + 1} must have a valid "id" field`);
				}
				if (!rule.type || typeof rule.type !== 'string') {
					throw new Error(`Rule ${index + 1} must have a valid "type" field`);
				}
				if (!rule.params || typeof rule.params !== 'object') {
					throw new Error(`Rule ${index + 1} must have a valid "params" object`);
				}
			});

			// Validate output format
			if (parsed.outputFormat.type !== 'CSV') {
				throw new Error('Output format type must be "CSV"');
			}

			const validConfig: ConfigurationJSON = {
				name: parsed.name,
				description: parsed.description || '',
				rules: parsed.rules,
				outputFormat: {
					type: 'CSV',
					delimiter: parsed.outputFormat.delimiter || ',',
					encoding: parsed.outputFormat.encoding || 'UTF-8',
					includeHeaders: parsed.outputFormat.includeHeaders !== false,
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
				setImportError(error instanceof Error ? error.message : 'Failed to import configuration');
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
				<button
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
				>
					<div>
						<h3 className="text-lg font-medium text-gray-900">JSON Configuration</h3>
						<p className="text-sm text-gray-500">Preview or import configuration as JSON</p>
					</div>
					<ChevronDown className="h-5 w-5 text-gray-400" />
				</button>
			</div>
		);
	}

	if (showImport) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white">
				<div className="border-b border-gray-200 p-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-medium text-gray-900">Import Configuration</h3>
							<p className="text-sm text-gray-500">Paste your JSON configuration below</p>
						</div>
						<button
							onClick={() => setIsCollapsed(true)}
							className="text-gray-400 hover:text-gray-600"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</button>
					</div>
				</div>

				<div className="p-4">
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
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
								<span className="text-sm text-green-700">Configuration imported successfully!</span>
							</div>
						)}

						<div className="flex justify-end space-x-3">
							<button
								onClick={handleImportCancel}
								className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								Cancel
							</button>
							<button
								onClick={handleImport}
								disabled={!importText.trim() || importSuccess}
								className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<Upload className="mr-2 h-4 w-4" />
								Import Configuration
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			<div className="border-b border-gray-200 p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-medium text-gray-900">JSON Configuration</h3>
						<p className="text-sm text-gray-500">
							{rules.length} rule{rules.length !== 1 ? 's' : ''} • {configJson.split('\n').length} lines
						</p>
					</div>
					<div className="flex items-center space-x-3">
						<button
							onClick={() => setShowImport(true)}
							className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
						>
							<Upload className="mr-1 h-3 w-3" />
							Import
						</button>
						<button
							onClick={handleCopy}
							className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
						>
							<Copy className="mr-1 h-3 w-3" />
							Copy
						</button>
						<button
							onClick={handleDownload}
							className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
						>
							<Download className="mr-1 h-3 w-3" />
							Download
						</button>
						<button
							onClick={() => setIsCollapsed(true)}
							className="text-gray-400 hover:text-gray-600"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</button>
					</div>
				</div>
			</div>

			<div className="p-4">
				<div className="rounded bg-gray-50 p-3">
					<pre className="whitespace-pre-wrap font-mono text-xs text-gray-800 max-h-96 overflow-auto">
						{configJson}
					</pre>
				</div>
			</div>
		</div>
	);
}