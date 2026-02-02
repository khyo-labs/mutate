import { useMutation } from '@tanstack/react-query';
import { FileUp, Loader2, Sparkles, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { aiApi } from '@/api/ai';
import type { TransformationRule } from '@/types';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';

type AiRuleGeneratorProps = {
	onRulesGenerated: (rules: TransformationRule[]) => void;
	existingRulesCount: number;
};

export function AiRuleGenerator({ onRulesGenerated, existingRulesCount }: AiRuleGeneratorProps) {
	const [inputFile, setInputFile] = useState<File | null>(null);
	const [outputFile, setOutputFile] = useState<File | null>(null);
	const [hint, setHint] = useState('');
	const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
	const pendingRulesRef = useRef<TransformationRule[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const outputRef = useRef<HTMLInputElement>(null);

	const generateMutation = useMutation({
		mutationFn: async () => {
			if (!inputFile || !outputFile) {
				throw new Error('Both files are required');
			}
			return aiApi.generateRules(inputFile, outputFile, hint || undefined);
		},
		onSuccess: (rules) => {
			if (existingRulesCount > 0) {
				pendingRulesRef.current = rules;
				setShowOverwriteDialog(true);
			} else {
				onRulesGenerated(rules);
				toast.success(
					`Generated ${rules.length} transformation rule${rules.length !== 1 ? 's' : ''}`,
				);
			}
		},
		onError: () => {
			// Error toast is already handled by the API client interceptor
		},
	});

	function handleConfirmOverwrite() {
		onRulesGenerated(pendingRulesRef.current);
		toast.success(
			`Generated ${pendingRulesRef.current.length} transformation rule${pendingRulesRef.current.length !== 1 ? 's' : ''}`,
		);
		pendingRulesRef.current = [];
		setShowOverwriteDialog(false);
	}

	function handleCancelOverwrite() {
		pendingRulesRef.current = [];
		setShowOverwriteDialog(false);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4" />
						AI Rule Generator
					</CardTitle>
					<CardDescription>
						Upload an input XLSX and expected output CSV to auto-generate transformation rules
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<FileDropZone
						label="Input XLSX"
						accept=".xlsx"
						file={inputFile}
						onFileChange={setInputFile}
						inputRef={inputRef}
					/>
					<FileDropZone
						label="Expected Output CSV"
						accept=".csv"
						file={outputFile}
						onFileChange={setOutputFile}
						inputRef={outputRef}
					/>
					<div>
						<Label htmlFor="ai-hint">Hint (optional)</Label>
						<textarea
							id="ai-hint"
							value={hint}
							onChange={(e) => setHint(e.target.value)}
							maxLength={500}
							rows={2}
							placeholder="e.g. Remove header rows, delete empty columns..."
							className="border-input dark:bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
						/>
						<p className="text-muted-foreground mt-1 text-xs">{hint.length}/500</p>
					</div>
					<Button
						type="button"
						className="w-full"
						disabled={!inputFile || !outputFile || generateMutation.isPending}
						onClick={() => generateMutation.mutate()}
					>
						{generateMutation.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Analyzing files...
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-4 w-4" />
								Generate Rules
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			<AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Replace existing rules?</AlertDialogTitle>
						<AlertDialogDescription>
							You have {existingRulesCount} existing rule
							{existingRulesCount !== 1 ? 's' : ''}. Generating new rules will replace all of them.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelOverwrite}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmOverwrite}>Replace Rules</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

type FileDropZoneProps = {
	label: string;
	accept: string;
	file: File | null;
	onFileChange: (file: File | null) => void;
	inputRef: React.RefObject<HTMLInputElement | null>;
};

function FileDropZone({ label, accept, file, onFileChange, inputRef }: FileDropZoneProps) {
	const [isDragOver, setIsDragOver] = useState(false);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const droppedFile = e.dataTransfer.files[0];
			if (droppedFile && droppedFile.name.endsWith(accept)) {
				onFileChange(droppedFile);
			} else {
				toast.error(`Please drop a ${accept.replace('.', '').toUpperCase()} file`);
			}
		},
		[onFileChange, accept],
	);

	function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = e.target.files?.[0];
		if (selected) {
			onFileChange(selected);
		}
	}

	function handleRemove(e: React.MouseEvent) {
		e.stopPropagation();
		onFileChange(null);
		if (inputRef.current) {
			inputRef.current.value = '';
		}
	}

	return (
		<div>
			<Label>{label}</Label>
			<div
				className={`border-input hover:border-ring mt-1 flex cursor-pointer items-center justify-between rounded-md border border-dashed p-3 transition-colors ${isDragOver ? 'border-ring bg-accent/50' : ''}`}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragOver(true);
				}}
				onDragLeave={() => setIsDragOver(false)}
				onDrop={handleDrop}
				onClick={() => inputRef.current?.click()}
			>
				{file ? (
					<>
						<span className="truncate text-sm">{file.name}</span>
						<button
							type="button"
							onClick={handleRemove}
							className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
						>
							<X className="h-4 w-4" />
						</button>
					</>
				) : (
					<span className="text-muted-foreground flex items-center gap-2 text-sm">
						<FileUp className="h-4 w-4" />
						Drop {accept.replace('.', '').toUpperCase()} or click to browse
					</span>
				)}
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					className="hidden"
					onChange={handleFileInput}
				/>
			</div>
		</div>
	);
}
