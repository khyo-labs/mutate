import { ChevronDown, Download, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';

import { escapeValues, simulateTransformations } from '@/lib/xlsx/transformations';
import type { Configuration, ProcessedData, TransformationRule, UploadedFile } from '@/types';

import { Button } from './ui/button';

export interface CsvOutputPreviewProps {
	file: UploadedFile | null;
	rules: TransformationRule[];
	outputFormat?: Configuration['outputFormat'];
}

export function CsvOutputPreview({
	file,
	rules,
	outputFormat = {
		type: 'CSV',
		delimiter: ',',
		encoding: 'UTF-8',
		includeHeaders: true,
	},
}: CsvOutputPreviewProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [showRawCsv, setShowRawCsv] = useState(false);

	const processedData = useMemo<ProcessedData | null>(() => {
		if (!file) return null;

		try {
			return simulateTransformations(file, rules);
		} catch (error) {
			console.error('Error processing transformations:', error);
			return null;
		}
	}, [file, rules]);

	const csvOutput = useMemo(() => {
		if (!processedData) return '';

		const lines: string[] = [];

		// Add headers if enabled
		// if (outputFormat.includeHeaders && processedData.headers.length > 0) {
		// 	lines.push(
		// 		processedData.headers
		// 			.map((h) => escapeCsvValue(h, outputFormat.delimiter))
		// 			.join(outputFormat.delimiter),
		// 	);
		// }

		// Add data rows
		processedData.data.forEach((row) => {
			const delimiter = 'delimiter' in outputFormat ? outputFormat.delimiter : ',';
			const csvRow = row
				.map((cell) => escapeValues(cell?.toString() || '', delimiter))
				.join(delimiter);
			lines.push(csvRow);
		});

		return lines.join('\n');
	}, [processedData, outputFormat]);

	function handleDownload() {
		if (!csvOutput) return;
		const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', 'preview.csv');
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	if (!file) {
		return (
			<div className="rounded-lg border border-border bg-muted/40 p-8 text-center">
				<Download className="mx-auto h-12 w-12 text-muted-foreground" />
				<h3 className="mt-2 text-sm font-medium text-foreground">No Output Preview</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Upload a file and add transformation rules to see CSV output
				</p>
			</div>
		);
	}

	if (isCollapsed) {
		return (
			<div className="rounded-lg border border-border bg-card text-card-foreground">
				<button
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/60"
				>
					<h3 className="text-lg font-medium text-foreground">CSV Output Preview</h3>
					<ChevronDown className="h-5 w-5 text-muted-foreground" />
				</button>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-card text-card-foreground">
			{/* Header */}
			<div className="border-b border-border p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-medium text-foreground">CSV Output Preview</h3>
						{processedData && (
							<p className="mt-1 text-sm text-muted-foreground">
								{processedData.rowCount} rows × {processedData.colCount} columns
								{processedData.appliedRules.length > 0 && (
									<span className="ml-2">
										• {processedData.appliedRules.length} rule
										{processedData.appliedRules.length !== 1 ? 's' : ''} applied
									</span>
								)}
							</p>
						)}
					</div>
					<div className="flex items-center space-x-3">
						<Button size="sm" variant="outline" onClick={() => setShowRawCsv(!showRawCsv)}>
							{showRawCsv ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
							Raw CSV
						</Button>
						<Button size="sm" onClick={handleDownload} disabled={!csvOutput}>
							<Download className="mr-1 h-3 w-3" />
							Download
						</Button>
						<Button onClick={() => setIsCollapsed(true)} variant="ghost" size="sm">
							<ChevronDown className="h-5 w-5 rotate-180" />
						</Button>
					</div>
				</div>

				{/* Warnings */}
				{processedData?.warnings && processedData.warnings.length > 0 && (
					<div className="mt-3 rounded-md bg-yellow-50 p-3 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200">
						<h4 className="text-sm font-medium">Warnings:</h4>
						<ul className="mt-1 text-sm">
							{processedData.warnings.map((warning, index) => (
								<li key={index}>• {warning}</li>
							))}
						</ul>
					</div>
				)}

				{/* Applied Rules */}
				{processedData?.appliedRules && processedData.appliedRules.length > 0 && (
					<div className="mt-3">
						<h4 className="text-xs font-medium text-muted-foreground">
							Applied Transformations:
						</h4>
						<div className="mt-1 flex flex-wrap gap-1">
							{processedData.appliedRules.map((rule, index) => (
								<span
									key={index}
									className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
								>
									{rule}
								</span>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="max-h-96 overflow-auto p-4">
				{showRawCsv ? (
					<div className="rounded bg-muted/50 p-3">
						<pre className="font-mono text-xs whitespace-pre-wrap text-foreground">
							{csvOutput.slice(0, 2000)}
							{csvOutput.length > 2000 && '\n... (truncated)'}
						</pre>
					</div>
				) : (
					processedData && (
						<div className="inline-block min-w-full">
							<table className="border-collapse">
								{/* {outputFormat.includeHeaders &&
									processedData.headers.length > 0 && (
										<thead>
											<tr>
												{processedData.headers.map((header, index) => (
													<th
														key={index}
														className="border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
													>
														{header}
													</th>
												))}
											</tr>
										</thead>
									)} */}
								<tbody>
									{processedData.data.slice(0, 20).map((row, rowIndex) => (
										<tr key={rowIndex}>
											{row.map((cell, colIndex) => (
												<td
													key={colIndex}
													className="border border-border px-3 py-1 text-xs text-foreground"
												>
													{cell?.toString() || ''}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
							{processedData.data.length > 20 && (
								<div className="mt-2 text-center text-xs text-muted-foreground">
									Showing first 20 rows of {processedData.data.length}
								</div>
							)}
						</div>
					)
				)}
			</div>
		</div>
	);
}
