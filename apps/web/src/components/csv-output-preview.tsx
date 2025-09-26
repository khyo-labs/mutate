import { ChevronDown, Download, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
	escapeValues,
	simulateTransformations,
} from '@/lib/xlsx/transformations';
import type {
	Configuration,
	ProcessedData,
	TransformationRule,
	UploadedFile,
} from '@/types';

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
			const delimiter =
				'delimiter' in outputFormat ? outputFormat.delimiter : ',';
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
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
				<Download className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-medium text-gray-900">
					No Output Preview
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Upload a file and add transformation rules to see CSV output
				</p>
			</div>
		);
	}

	if (isCollapsed) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white">
				<button
					onClick={() => setIsCollapsed(false)}
					className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
				>
					<h3 className="text-lg font-medium text-gray-900">
						CSV Output Preview
					</h3>
					<ChevronDown className="h-5 w-5 text-gray-400" />
				</button>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			{/* Header */}
			<div className="border-b border-gray-200 p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-medium text-gray-900">
							CSV Output Preview
						</h3>
						{processedData && (
							<p className="mt-1 text-sm text-gray-500">
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
						<Button
							size="sm"
							variant="outline"
							onClick={() => setShowRawCsv(!showRawCsv)}
						>
							{showRawCsv ? (
								<Eye className="mr-1 h-3 w-3" />
							) : (
								<EyeOff className="mr-1 h-3 w-3" />
							)}
							Raw CSV
						</Button>
						<Button size="sm" onClick={handleDownload} disabled={!csvOutput}>
							<Download className="mr-1 h-3 w-3" />
							Download
						</Button>
						<Button
							onClick={() => setIsCollapsed(true)}
							variant="ghost"
							size="sm"
						>
							<ChevronDown className="h-5 w-5 rotate-180" />
						</Button>
					</div>
				</div>

				{/* Warnings */}
				{processedData?.warnings && processedData.warnings.length > 0 && (
					<div className="mt-3 rounded-md bg-yellow-50 p-3">
						<h4 className="text-sm font-medium text-yellow-800">Warnings:</h4>
						<ul className="mt-1 text-sm text-yellow-700">
							{processedData.warnings.map((warning, index) => (
								<li key={index}>• {warning}</li>
							))}
						</ul>
					</div>
				)}

				{/* Applied Rules */}
				{processedData?.appliedRules &&
					processedData.appliedRules.length > 0 && (
						<div className="mt-3">
							<h4 className="text-xs font-medium text-gray-700">
								Applied Transformations:
							</h4>
							<div className="mt-1 flex flex-wrap gap-1">
								{processedData.appliedRules.map((rule, index) => (
									<span
										key={index}
										className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
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
					<div className="rounded bg-gray-50 p-3">
						<pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">
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
													className="border border-gray-200 px-3 py-1 text-xs"
												>
													{cell?.toString() || ''}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
							{processedData.data.length > 20 && (
								<div className="mt-2 text-center text-xs text-gray-500">
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
