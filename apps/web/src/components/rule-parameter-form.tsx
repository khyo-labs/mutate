import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';

import type {
	DeleteColumnsRule,
	DeleteRowsRule,
	SelectWorksheetRule,
	TransformationRule,
	UnmergeAndFillRule,
	ValidateColumnsRule,
} from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

interface RuleParameterFormProps {
	rule: TransformationRule;
	onChange: (rule: TransformationRule) => void;
	defaultExpanded?: boolean;
}

export function RuleParameterForm({ rule, onChange, defaultExpanded }: RuleParameterFormProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);

	function updateParams(newParams: Record<string, unknown>) {
		onChange({
			...rule,
			params: { ...rule.params, ...newParams },
		} as TransformationRule);
	}

	function renderParameterForm() {
		switch (rule.type) {
			case 'SELECT_WORKSHEET':
				return <SelectWorksheetForm rule={rule as SelectWorksheetRule} onChange={updateParams} />;
			case 'VALIDATE_COLUMNS':
				return <ValidateColumnsForm rule={rule as ValidateColumnsRule} onChange={updateParams} />;
			case 'UNMERGE_AND_FILL':
				return <UnmergeAndFillForm rule={rule as UnmergeAndFillRule} onChange={updateParams} />;
			case 'DELETE_ROWS':
				return <DeleteRowsForm rule={rule as DeleteRowsRule} onChange={updateParams} />;
			case 'DELETE_COLUMNS':
				return <DeleteColumnsForm rule={rule as DeleteColumnsRule} onChange={updateParams} />;
			case 'COMBINE_WORKSHEETS':
				return <CombineWorksheetsForm rule={rule} onChange={updateParams} />;
			case 'EVALUATE_FORMULAS':
				return <EvaluateFormulasForm rule={rule} onChange={updateParams} />;
			case 'REPLACE_CHARACTERS':
				return <ReplaceCharactersForm rule={rule} onChange={updateParams} />;
			default:
				return <div className="text-muted-foreground text-sm">No parameters</div>;
		}
	}

	return (
		<div className="mt-3">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setIsExpanded(!isExpanded)}
				className="text-muted-foreground hover:text-foreground w-full justify-between px-0"
			>
				<span className="text-xs">Configure Parameters</span>
				{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
			</Button>

			{isExpanded && (
				<div className="border-border mt-3 space-y-3 border-t pt-3">{renderParameterForm()}</div>
			)}
		</div>
	);
}

function SelectWorksheetForm({
	rule,
	onChange,
}: {
	rule: SelectWorksheetRule;
	onChange: (params: SelectWorksheetRule['params']) => void;
}) {
	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">Identifier Type</Label>
				<Select
					value={rule.params.type || 'name'}
					onValueChange={(value) =>
						onChange({
							...rule.params,
							type: value as SelectWorksheetRule['params']['type'],
						})
					}
				>
					<SelectTrigger size="sm" className="mt-1 w-full text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">By Name</SelectItem>
						<SelectItem value="pattern">By Pattern</SelectItem>
						<SelectItem value="index">By Index</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div>
				<Label className="text-xs">Worksheet Identifier</Label>
				<Input
					value={rule.params.value || ''}
					onChange={(e) => onChange({ ...rule.params, value: e.target.value })}
					placeholder={
						rule.params.type === 'index'
							? 'e.g., 0'
							: rule.params.type === 'pattern'
								? 'e.g., Sheet*'
								: 'e.g., Sheet1'
					}
					className="mt-1 h-8 text-xs"
				/>
			</div>
		</div>
	);
}

function ValidateColumnsForm({
	rule,
	onChange,
}: {
	rule: ValidateColumnsRule;
	onChange: (params: ValidateColumnsRule['params']) => void;
}) {
	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">Expected Column Count</Label>
				<Input
					type="number"
					value={rule.params.numOfColumns || 0}
					onChange={(e) =>
						onChange({
							...rule.params,
							numOfColumns: parseInt(e.target.value) || 0,
						})
					}
					min="1"
					className="mt-1 h-8 text-xs"
				/>
			</div>
			<div>
				<Label className="text-xs">On Failure</Label>
				<Select
					value={rule.params.onFailure || 'stop'}
					onValueChange={(value) =>
						onChange({
							...rule.params,
							onFailure: value as ValidateColumnsRule['params']['onFailure'],
						})
					}
				>
					<SelectTrigger size="sm" className="mt-1 w-full text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="stop">Stop Processing</SelectItem>
						<SelectItem value="notify">Notify and Continue</SelectItem>
						<SelectItem value="continue">Continue Silently</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

function UnmergeAndFillForm({
	rule,
	onChange,
}: {
	rule: UnmergeAndFillRule;
	onChange: (params: UnmergeAndFillRule['params']) => void;
}) {
	const [columnInput, setColumnInput] = useState('');

	function addColumn() {
		if (columnInput.trim()) {
			const currentColumns = rule.params.columns || [];
			onChange({
				...rule.params,
				columns: [...currentColumns, columnInput.trim()],
			});
			setColumnInput('');
		}
	}

	function removeColumn(index: number) {
		const currentColumns = rule.params.columns || [];
		onChange({
			...rule.params,
			columns: currentColumns.filter((_, i) => i !== index),
		});
	}

	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">Fill Direction</Label>
				<Select
					value={rule.params.fillDirection || 'down'}
					onValueChange={(value) =>
						onChange({
							...rule.params,
							fillDirection: value as UnmergeAndFillRule['params']['fillDirection'],
						})
					}
				>
					<SelectTrigger size="sm" className="mt-1 w-full text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="down">Fill Down</SelectItem>
						<SelectItem value="up">Fill Up</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div>
				<Label className="text-xs">Columns to Process</Label>
				<div className="mt-1 flex gap-1">
					<Input
						value={columnInput}
						onChange={(e) => setColumnInput(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColumn())}
						placeholder="Column name or index"
						className="h-8 flex-1 text-xs"
					/>
					<Button type="button" size="sm" onClick={addColumn}>
						Add
					</Button>
				</div>
				{rule.params.columns && rule.params.columns.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{rule.params.columns.map((column: string, index: number) => (
							<Badge key={index} variant="secondary" className="gap-1 pr-1">
								{column}
								<button
									type="button"
									onClick={() => removeColumn(index)}
									className="text-muted-foreground hover:text-foreground rounded-full"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function DeleteRowsForm({
	rule,
	onChange,
}: {
	rule: DeleteRowsRule;
	onChange: (params: DeleteRowsRule['params']) => void;
}) {
	const [rowInput, setRowInput] = useState('');
	const method = rule.params.method || 'condition';

	function addRow() {
		const rowNumber = parseInt(rowInput.trim());
		if (!isNaN(rowNumber) && rowNumber > 0) {
			const currentRows = rule.params.rows || [];
			if (!currentRows.includes(rowNumber)) {
				onChange({
					...rule.params,
					rows: [...currentRows, rowNumber].sort((a, b) => a - b),
				});
			}
			setRowInput('');
		}
	}

	function removeRow(rowNumber: number) {
		const currentRows = rule.params.rows || [];
		onChange({
			...rule.params,
			rows: currentRows.filter((row) => row !== rowNumber),
		});
	}

	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">Delete Method</Label>
				<Select
					value={method}
					onValueChange={(value) =>
						onChange({
							method: value as 'condition' | 'rows',
							...(value === 'condition' ? { rows: undefined } : { condition: undefined }),
						})
					}
				>
					<SelectTrigger size="sm" className="mt-1 w-full text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="condition">By Condition</SelectItem>
						<SelectItem value="rows">By Row Numbers</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{method === 'condition' && (
				<>
					<div>
						<Label className="text-xs">Condition Type</Label>
						<Select
							value={rule.params.condition?.type || 'contains'}
							onValueChange={(value) =>
								onChange({
									...rule.params,
									condition: {
										...rule.params.condition,
										type: value as NonNullable<DeleteRowsRule['params']['condition']>['type'],
									},
								})
							}
						>
							<SelectTrigger size="sm" className="mt-1 w-full text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="contains">Contains Text</SelectItem>
								<SelectItem value="empty">Is Empty</SelectItem>
								<SelectItem value="pattern">Matches Pattern</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="text-xs">
							Column {rule.params.condition?.type === 'empty' ? '(optional)' : ''}
						</Label>
						<Input
							value={rule.params.condition?.column || ''}
							onChange={(e) =>
								onChange({
									...rule.params,
									condition: {
										type: rule.params.condition?.type || 'contains',
										...rule.params.condition,
										column: e.target.value,
									},
								})
							}
							placeholder={
								rule.params.condition?.type === 'empty'
									? "Leave empty to check all columns, or specify column (e.g., 'B', '1', 'Name')"
									: "Column name, letter, or index (e.g., 'B', '1', 'Name')"
							}
							className="mt-1 h-8 text-xs"
						/>
						{rule.params.condition?.type === 'empty' && (
							<p className="text-muted-foreground mt-1 text-xs">
								Leave blank to delete rows where ALL columns are empty, or specify a column to check
								only that column
							</p>
						)}
					</div>
					{rule.params.condition?.type !== 'empty' && (
						<div>
							<Label className="text-xs">Value</Label>
							<Input
								value={rule.params.condition?.value || ''}
								onChange={(e) =>
									onChange({
										...rule.params,
										condition: {
											type: rule.params.condition?.type || 'contains',
											...rule.params.condition,
											value: e.target.value,
										},
									})
								}
								placeholder={
									rule.params.condition?.type === 'pattern' ? 'Regular expression' : 'Text to match'
								}
								className={`mt-1 h-8 text-xs ${
									rule.params.condition?.type === 'pattern' ? 'font-mono' : ''
								}`}
							/>
						</div>
					)}
				</>
			)}

			{method === 'rows' && (
				<>
					<div>
						<Label className="text-xs">Row Numbers to Delete</Label>
						<div className="mt-1 flex gap-1">
							<Input
								type="number"
								min="1"
								value={rowInput}
								onChange={(e) => setRowInput(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRow())}
								placeholder="Row number (e.g., 1)"
								className="h-8 flex-1 text-xs"
							/>
							<Button type="button" variant="destructive" size="sm" onClick={addRow}>
								Add
							</Button>
						</div>
						<p className="text-muted-foreground mt-1 text-xs">
							Row numbers are 1-based (first row is 1)
						</p>
					</div>
					{rule.params.rows && rule.params.rows.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{rule.params.rows.map((rowNumber, index) => (
								<Badge key={index} variant="destructive" className="gap-1 pr-1">
									Row {rowNumber}
									<button
										type="button"
										onClick={() => removeRow(rowNumber)}
										className="hover:text-destructive-foreground/80 rounded-full"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}

function DeleteColumnsForm({
	rule,
	onChange,
}: {
	rule: DeleteColumnsRule;
	onChange: (params: DeleteColumnsRule['params']) => void;
}) {
	const [columnInput, setColumnInput] = useState('');

	function addColumn() {
		if (columnInput.trim()) {
			const currentColumns = rule.params.columns || [];
			onChange({
				columns: [...currentColumns, columnInput.trim()],
			});
			setColumnInput('');
		}
	}

	function removeColumn(index: number) {
		const currentColumns = rule.params.columns || [];
		onChange({
			columns: currentColumns.filter((_, i) => i !== index),
		});
	}

	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">Columns to Delete</Label>
				<div className="mt-1 flex gap-1">
					<Input
						value={columnInput}
						onChange={(e) => setColumnInput(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColumn())}
						placeholder="Column name or index"
						className="h-8 flex-1 text-xs"
					/>
					<Button type="button" variant="destructive" size="sm" onClick={addColumn}>
						Add
					</Button>
				</div>
				{rule.params.columns && rule.params.columns.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{rule.params.columns.map((column: string, index: number) => (
							<Badge key={index} variant="destructive" className="gap-1 pr-1">
								{column}
								<button
									type="button"
									onClick={() => removeColumn(index)}
									className="hover:text-destructive-foreground/80 rounded-full"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function CombineWorksheetsForm({
	rule,
	onChange,
}: {
	rule: import('../types').CombineWorksheetsRule;
	onChange: (params: import('../types').CombineWorksheetsRule['params']) => void;
}) {
	const [sheetInput, setSheetInput] = useState('');

	function addSheet() {
		if (sheetInput.trim()) {
			const currentSheets = rule.params.sourceSheets || [];
			onChange({
				...rule.params,
				sourceSheets: [...currentSheets, sheetInput.trim()],
			});
			setSheetInput('');
		}
	}

	function removeSheet(index: number) {
		const currentSheets = rule.params.sourceSheets || [];
		onChange({
			...rule.params,
			sourceSheets: currentSheets.filter((_: unknown, i: number) => i !== index),
		});
	}

	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">Operation</Label>
				<Select
					value={rule.params.operation || 'append'}
					onValueChange={(value) =>
						onChange({
							...rule.params,
							operation: value as 'append' | 'merge',
						})
					}
				>
					<SelectTrigger size="sm" className="mt-1 w-full text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="append">Append Rows</SelectItem>
						<SelectItem value="merge">Merge Data</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div>
				<Label className="text-xs">Source Sheets (optional)</Label>
				<p className="text-muted-foreground mt-1 text-xs">
					Leave blank to use worksheets selected by prior SELECT_WORKSHEET rules.
				</p>
				<div className="mt-1 flex gap-1">
					<Input
						value={sheetInput}
						onChange={(e) => setSheetInput(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSheet())}
						placeholder="Sheet name"
						className="h-8 flex-1 text-xs"
					/>
					<Button type="button" size="sm" onClick={addSheet}>
						Add
					</Button>
				</div>
				{rule.params.sourceSheets && rule.params.sourceSheets.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{rule.params.sourceSheets.map((sheet: string, index: number) => (
							<Badge key={index} variant="secondary" className="gap-1 pr-1">
								{sheet}
								<button
									type="button"
									onClick={() => removeSheet(index)}
									className="text-muted-foreground hover:text-foreground rounded-full"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function EvaluateFormulasForm({
	rule,
	onChange,
}: {
	rule: import('../types').EvaluateFormulasRule;
	onChange: (params: import('../types').EvaluateFormulasRule['params']) => void;
}) {
	return (
		<div className="flex items-center gap-3">
			<Switch
				checked={rule.params.enabled || false}
				onCheckedChange={(checked) => onChange({ enabled: checked })}
			/>
			<Label className="text-xs">Evaluate and replace formulas with calculated values</Label>
		</div>
	);
}

function ReplaceCharactersForm({
	rule,
	onChange,
}: {
	rule: import('../types').ReplaceCharactersRule;
	onChange: (params: import('../types').ReplaceCharactersRule['params']) => void;
}) {
	const [replacements, setReplacements] = useState(
		rule.params.replacements || [{ find: '', replace: '', scope: 'all' }],
	);

	function updateReplacement(
		index: number,
		field: string,
		value: string | string[] | number[] | 'all' | 'specific_columns' | 'specific_rows',
	) {
		const updated = [...replacements];
		updated[index] = { ...updated[index], [field]: value };
		setReplacements(updated);
		onChange({ replacements: updated });
	}

	function addReplacement() {
		const updated = [...replacements, { find: '', replace: '', scope: 'all' as const }];
		setReplacements(updated as typeof replacements);
		onChange({ replacements: updated as typeof replacements });
	}

	function removeReplacement(index: number) {
		const updated = replacements.filter((_: unknown, i: number) => i !== index);
		setReplacements(updated);
		onChange({ replacements: updated });
	}

	function handleColumnsChange(index: number, value: string) {
		const columns = value
			.split(',')
			.map((col) => col.trim().toUpperCase())
			.filter((col) => col);
		updateReplacement(index, 'columns', columns);
	}

	function handleRowsChange(index: number, value: string) {
		const rows = value
			.split(',')
			.map((row) => parseInt(row.trim()))
			.filter((row) => !isNaN(row));
		updateReplacement(index, 'rows', rows);
	}

	return (
		<div className="space-y-3">
			{replacements.map(
				(
					replacement: import('../types').ReplaceCharactersRule['params']['replacements'][number],
					index: number,
				) => (
					<div key={index} className="border-border space-y-2 rounded-lg border p-3">
						<div className="flex gap-2">
							<div className="flex-1">
								<Label className="text-xs">Find</Label>
								<Input
									value={replacement.find}
									onChange={(e) => updateReplacement(index, 'find', e.target.value)}
									placeholder="Character(s) to find"
									className="mt-1 h-8 text-xs"
								/>
							</div>
							<div className="flex-1">
								<Label className="text-xs">Replace with</Label>
								<Input
									value={replacement.replace}
									onChange={(e) => updateReplacement(index, 'replace', e.target.value)}
									placeholder="Replace with"
									className="mt-1 h-8 text-xs"
								/>
							</div>
						</div>
						<div>
							<Label className="text-xs">Scope</Label>
							<Select
								value={replacement.scope || 'all'}
								onValueChange={(value) => updateReplacement(index, 'scope', value)}
							>
								<SelectTrigger size="sm" className="mt-1 w-full text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All cells</SelectItem>
									<SelectItem value="specific_columns">Specific columns</SelectItem>
									<SelectItem value="specific_rows">Specific rows</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{replacement.scope === 'specific_columns' && (
							<div>
								<Label className="text-xs">Columns (comma-separated, e.g., A, B, C)</Label>
								<Input
									value={replacement.columns?.join(', ') || ''}
									onChange={(e) => handleColumnsChange(index, e.target.value)}
									placeholder="A, B, C"
									className="mt-1 h-8 text-xs"
								/>
							</div>
						)}
						{replacement.scope === 'specific_rows' && (
							<div>
								<Label className="text-xs">Row numbers (comma-separated, 1-based)</Label>
								<Input
									value={replacement.rows?.join(', ') || ''}
									onChange={(e) => handleRowsChange(index, e.target.value)}
									placeholder="1, 2, 3"
									className="mt-1 h-8 text-xs"
								/>
							</div>
						)}
						{replacements.length > 1 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => removeReplacement(index)}
								className="text-destructive hover:text-destructive/80 h-auto px-0 text-xs"
							>
								Remove
							</Button>
						)}
					</div>
				),
			)}
			<Button type="button" size="sm" onClick={addReplacement}>
				Add Replacement
			</Button>
		</div>
	);
}
