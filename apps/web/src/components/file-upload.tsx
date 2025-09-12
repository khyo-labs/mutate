import { File, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';

import { Button } from './ui/button';

export interface UploadedFile {
	name: string;
	size: number;
	data: File;
	workbook: XLSX.WorkBook;
	worksheets: string[];
}

interface FileUploadProps {
	onFileUploaded: (file: UploadedFile | null) => void;
	currentFile: UploadedFile | null;
}

export function FileUpload({ onFileUploaded, currentFile }: FileUploadProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const processFile = useCallback(
		async (file: File) => {
			if (!file.name.match(/\.(xlsx|xls)$/i)) {
				setError('Please upload an Excel file (.xlsx or .xls)');
				return;
			}

			setIsProcessing(true);
			setError(null);

			try {
				const arrayBuffer = await file.arrayBuffer();
				const workbook = XLSX.read(arrayBuffer, { type: 'array' });
				const worksheets = workbook.SheetNames;

				const uploadedFile: UploadedFile = {
					name: file.name,
					size: file.size,
					data: file,
					workbook,
					worksheets,
				};

				onFileUploaded(uploadedFile);
			} catch (err) {
				console.error('Error processing file:', err);
				setError(
					'Failed to process the Excel file. Please check the file format.',
				);
			} finally {
				setIsProcessing(false);
			}
		},
		[onFileUploaded],
	);

	const handleFileSelect = useCallback(
		(files: FileList | null) => {
			if (files && files.length > 0) {
				processFile(files[0]);
			}
		},
		[processFile],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			handleFileSelect(e.dataTransfer.files);
		},
		[handleFileSelect],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleRemoveFile = useCallback(() => {
		onFileUploaded(null);
		setError(null);
	}, [onFileUploaded]);

	function formatFileSize(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	if (currentFile) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="rounded-lg bg-green-100 p-2">
							<File className="h-5 w-5 text-green-600" />
						</div>
						<div>
							<p className="text-sm font-medium text-gray-900">
								{currentFile.name}
							</p>
							<p className="text-xs text-gray-500">
								{formatFileSize(currentFile.size)} •{' '}
								{currentFile.worksheets.length} worksheet
								{currentFile.worksheets.length !== 1 ? 's' : ''}
							</p>
							<p className="text-xs text-gray-500">
								Worksheets: {currentFile.worksheets.join(', ')}
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleRemoveFile}
						className="text-gray-400 hover:text-red-500 p-1"
						title="Remove file"
					>
						<X className="h-5 w-5" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
					isDragOver
						? 'border-blue-400 bg-blue-50'
						: 'border-gray-300 bg-gray-50'
				} ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
			>
				<input
					type="file"
					accept=".xlsx,.xls"
					onChange={(e) => handleFileSelect(e.target.files)}
					disabled={isProcessing}
					className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				/>

				<div className="space-y-4">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
						<Upload
							className={`h-6 w-6 ${isProcessing ? 'animate-pulse' : ''} text-gray-400`}
						/>
					</div>

					<div>
						<h3 className="text-lg font-medium text-gray-900">
							{isProcessing ? 'Processing...' : 'Upload Excel File'}
						</h3>
						<p className="mt-1 text-sm text-gray-500">
							{isProcessing
								? 'Reading and parsing your Excel file...'
								: 'Drag and drop your .xlsx or .xls file here, or click to browse'}
						</p>
					</div>

					{!isProcessing && (
						<Button variant="default">
							Choose File
						</Button>
					)}
				</div>
			</div>

			{error && (
				<div className="mt-3 rounded-md bg-red-50 p-3">
					<div className="text-sm text-red-700">{error}</div>
				</div>
			)}
		</div>
	);
}
