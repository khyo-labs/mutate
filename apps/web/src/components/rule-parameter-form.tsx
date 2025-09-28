import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import type {
	DeleteColumnsRule,
	DeleteRowsRule,
	SelectWorksheetRule,
	TransformationRule,
	UnmergeAndFillRule,
	ValidateColumnsRule,
} from '../types';

interface RuleParameterFormProps {
	rule: TransformationRule;
	onChange: (rule: TransformationRule) => void;
}

export function RuleParameterForm({ rule, onChange }: RuleParameterFormProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	function updateParams(newParams: Record<string, unknown>) {
		onChange({
			...rule,
			params: { ...rule.params, ...newParams },
		} as TransformationRule);
	}

	function renderParameterForm() {
		switch (rule.type) {
			case 'SELECT_WORKSHEET':
				return (
					<SelectWorksheetForm
						rule={rule as SelectWorksheetRule}
						onChange={updateParams}
					/>
				);
			case 'VALIDATE_COLUMNS':
				return (
					<ValidateColumnsForm
						rule={rule as ValidateColumnsRule}
						onChange={updateParams}
					/>
				);
			case 'UNMERGE_AND_FILL':
				return (
					<UnmergeAndFillForm
						rule={rule as UnmergeAndFillRule}
						onChange={updateParams}
					/>
				);
			case 'DELETE_ROWS':
				return (
					<DeleteRowsForm
						rule={rule as DeleteRowsRule}
						onChange={updateParams}
					/>
				);
			case 'DELETE_COLUMNS':
				return (
					<DeleteColumnsForm
						rule={rule as DeleteColumnsRule}
						onChange={updateParams}
					/>
				);
			case 'COMBINE_WORKSHEETS':
				return <CombineWorksheetsForm rule={rule} onChange={updateParams} />;
			case 'EVALUATE_FORMULAS':
				return <EvaluateFormulasForm rule={rule} onChange={updateParams} />;
			case 'REPLACE_CHARACTERS':
				return <ReplaceCharactersForm rule={rule} onChange={updateParams} />;
			default:
				return <div className="text-sm text-gray-500">No parameters</div>;
		}
	}

	return (
		<div className="mt-3">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex w-full items-center justify-between text-left text-sm text-gray-600 hover:text-gray-800"
			>
				<span>Configure Parameters</span>
				{isExpanded ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)}
			</button>

			{isExpanded && (
				<div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
					{renderParameterForm()}
				</div>
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
				<label className="block text-xs font-medium text-gray-700">
					Identifier Type
				</label>
				<select
					value={rule.params.type || 'name'}
					onChange={(e) =>
						onChange({
							...rule.params,
							type: e.target.value as SelectWorksheetRule['params']['type'],
						})
					}
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
				>
					<option value="name">By Name</option>
					<option value="pattern">By Pattern</option>
					<option value="index">By Index</option>
				</select>
			</div>
			<div>
				<label className="block text-xs font-medium text-gray-700">
					Worksheet Identifier
				</label>
				<input
					type="text"
					value={rule.params.value || ''}
					onChange={(e) => onChange({ ...rule.params, value: e.target.value })}
					placeholder={
						rule.params.type === 'index'
							? 'e.g., 0'
							: rule.params.type === 'pattern'
								? 'e.g., Sheet*'
								: 'e.g., Sheet1'
					}
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
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
				<label className="block text-xs font-medium text-gray-700">
					Expected Column Count
				</label>
				<input
					type="number"
					value={rule.params.numOfColumns || 0}
					onChange={(e) =>
						onChange({
							...rule.params,
							numOfColumns: parseInt(e.target.value) || 0,
						})
					}
					min="1"
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label className="block text-xs font-medium text-gray-700">
					On Failure
				</label>
				<select
					value={rule.params.onFailure || 'stop'}
					onChange={(e) =>
						onChange({
							...rule.params,
							onFailure: e.target
								.value as ValidateColumnsRule['params']['onFailure'],
						})
					}
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
				>
					<option value="stop">Stop Processing</option>
					<option value="notify">Notify and Continue</option>
					<option value="continue">Continue Silently</option>
				</select>
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
				<label className="block text-xs font-medium text-gray-700">
					Fill Direction
				</label>
				<select
					value={rule.params.fillDirection || 'down'}
					onChange={(e) =>
						onChange({
							...rule.params,
							fillDirection: e.target
								.value as UnmergeAndFillRule['params']['fillDirection'],
						})
					}
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
				>
					<option value="down">Fill Down</option>
					<option value="up">Fill Up</option>
				</select>
			</div>
			<div>
				<label className="block text-xs font-medium text-gray-700">
					Columns to Process
				</label>
				<div className="mt-1 flex space-x-1">
					<input
						type="text"
						value={columnInput}
						onChange={(e) => setColumnInput(e.target.value)}
						placeholder="Column name or index"
						className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
					/>
					<button
						type="button"
						onClick={addColumn}
						className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
					>
						Add
					</button>
				</div>
				{rule.params.columns && rule.params.columns.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{rule.params.columns.map((column: string, index: number) => (
							<span
								key={index}
								className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-800"
							>
								{column}
								<button
									type="button"
									onClick={() => removeColumn(index)}
									className="ml-1 text-gray-500 hover:text-gray-700"
								>
									×
								</button>
							</span>
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
				<label className="block text-xs font-medium text-gray-700">
					Delete Method
				</label>
				<select
					value={method}
					onChange={(e) =>
						onChange({
							method: e.target.value as 'condition' | 'rows',
							// Clear the other method's params
							...(e.target.value === 'condition'
								? { rows: undefined }
								: { condition: undefined }),
						})
					}
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
				>
					<option value="condition">By Condition</option>
					<option value="rows">By Row Numbers</option>
				</select>
			</div>

			{method === 'condition' && (
				<>
					<div>
						<label className="block text-xs font-medium text-gray-700">
							Condition Type
						</label>
						<select
							value={rule.params.condition?.type || 'contains'}
							onChange={(e) =>
								onChange({
									...rule.params,
									condition: {
										...rule.params.condition,
										type: e.target.value as NonNullable<
											DeleteRowsRule['params']['condition']
										>['type'],
									},
								})
							}
							className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
						>
							<option value="contains">Contains Text</option>
							<option value="empty">Is Empty</option>
							<option value="pattern">Matches Pattern</option>
						</select>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-700">
							Column{' '}
							{rule.params.condition?.type === 'empty' ? '(optional)' : ''}
						</label>
						<input
							type="text"
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
							className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
						/>
						{rule.params.condition?.type === 'empty' && (
							<div className="mt-1 text-xs text-gray-500">
								Leave blank to delete rows where ALL columns are empty, or
								specify a column to check only that column
							</div>
						)}
					</div>
					{rule.params.condition?.type !== 'empty' && (
						<div>
							<label className="block text-xs font-medium text-gray-700">
								Value
							</label>
							<input
								type="text"
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
									rule.params.condition?.type === 'pattern'
										? 'Regular expression'
										: 'Text to match'
								}
								className={`mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none ${
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
						<label className="block text-xs font-medium text-gray-700">
							Row Numbers to Delete
						</label>
						<div className="mt-1 flex space-x-1">
							<input
								type="number"
								min="1"
								value={rowInput}
								onChange={(e) => setRowInput(e.target.value)}
								placeholder="Row number (e.g., 1)"
								className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
							/>
							<button
								type="button"
								onClick={addRow}
								className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
							>
								Add
							</button>
						</div>
						<div className="mt-1 text-xs text-gray-500">
							Row numbers are 1-based (first row is 1)
						</div>
					</div>
					{rule.params.rows && rule.params.rows.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{rule.params.rows.map((rowNumber, index) => (
								<span
									key={index}
									className="inline-flex items-center rounded bg-red-100 px-2 py-1 text-xs text-red-800"
								>
									Row {rowNumber}
									<button
										type="button"
										onClick={() => removeRow(rowNumber)}
										className="ml-1 text-red-500 hover:text-red-700"
									>
										×
									</button>
								</span>
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
				<label className="block text-xs font-medium text-gray-700">
					Columns to Delete
				</label>
				<div className="mt-1 flex space-x-1">
					<input
						type="text"
						value={columnInput}
						onChange={(e) => setColumnInput(e.target.value)}
						placeholder="Column name or index"
						className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
					/>
					<button
						type="button"
						onClick={addColumn}
						className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
					>
						Add
					</button>
				</div>
				{rule.params.columns && rule.params.columns.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{rule.params.columns.map((column: string, index: number) => (
							<span
								key={index}
								className="inline-flex items-center rounded bg-red-100 px-2 py-1 text-xs text-red-800"
							>
								{column}
								<button
									type="button"
									onClick={() => removeColumn(index)}
									className="ml-1 text-red-500 hover:text-red-700"
								>
									×
								</button>
							</span>
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
	onChange: (
		params: import('../types').CombineWorksheetsRule['params'],
	) => void;
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
			sourceSheets: currentSheets.filter(
				(_: unknown, i: number) => i !== index,
			),
		});
	}

	return (
		<div className="space-y-3">
			<div>
				<label className="block text-xs font-medium text-gray-700">
					Operation
				</label>
				<select
					value={rule.params.operation || 'append'}
					onChange={(e) =>
						onChange({
							...rule.params,
							operation: e.target.value as 'append' | 'merge',
						})
					}
					className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
				>
					<option value="append">Append Rows</option>
					<option value="merge">Merge Data</option>
				</select>
			</div>
			<div>
				<label className="block text-xs font-medium text-gray-700">
					Source Sheets (optional)
				</label>
				<div className="mt-1 text-xs text-gray-500">
					Leave blank to use worksheets selected by prior SELECT_WORKSHEET
					rules.
				</div>
				<div className="mt-1 flex space-x-1">
					<input
						type="text"
						value={sheetInput}
						onChange={(e) => setSheetInput(e.target.value)}
						placeholder="Sheet name"
						className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
					/>
					<button
						type="button"
						onClick={addSheet}
						className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
					>
						Add
					</button>
				</div>
				{rule.params.sourceSheets && rule.params.sourceSheets.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{rule.params.sourceSheets.map((sheet: string, index: number) => (
							<span
								key={index}
								className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
							>
								{sheet}
								<button
									type="button"
									onClick={() => removeSheet(index)}
									className="ml-1 text-blue-500 hover:text-blue-700"
								>
									×
								</button>
							</span>
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
		<div>
			<label className="flex items-center space-x-2">
				<input
					type="checkbox"
					checked={rule.params.enabled || false}
					onChange={(e) => onChange({ enabled: e.target.checked })}
					className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<span className="text-xs text-gray-700">
					Evaluate and replace formulas with calculated values
				</span>
			</label>
		</div>
	);
}

function ReplaceCharactersForm({
	rule,
	onChange,
}: {
	rule: import('../types').ReplaceCharactersRule;
	onChange: (
		params: import('../types').ReplaceCharactersRule['params'],
	) => void;
}) {
	const [replacements, setReplacements] = useState(
		rule.params.replacements || [{ find: '', replace: '', scope: 'all' }],
	);

	const updateReplacement = (
		index: number,
		field: string,
		value:
			| string
			| string[]
			| number[]
			| 'all'
			| 'specific_columns'
			| 'specific_rows',
	) => {
		const updated = [...replacements];
		updated[index] = { ...updated[index], [field]: value };
		setReplacements(updated);
		onChange({ replacements: updated });
	};

	const addReplacement = () => {
		const updated = [
			...replacements,
			{ find: '', replace: '', scope: 'all' as const },
		];
		setReplacements(updated as typeof replacements);
		onChange({ replacements: updated as typeof replacements });
	};

	const removeReplacement = (index: number) => {
		const updated = replacements.filter((_: unknown, i: number) => i !== index);
		setReplacements(updated);
		onChange({ replacements: updated });
	};

	const handleColumnsChange = (index: number, value: string) => {
		const columns = value
			.split(',')
			.map((col) => col.trim().toUpperCase())
			.filter((col) => col);
		updateReplacement(index, 'columns', columns);
	};

	const handleRowsChange = (index: number, value: string) => {
		const rows = value
			.split(',')
			.map((row) => parseInt(row.trim()))
			.filter((row) => !isNaN(row));
		updateReplacement(index, 'rows', rows);
	};

	return (
		<div className="space-y-3">
			{replacements.map(
				(
					replacement: import('../types').ReplaceCharactersRule['params']['replacements'][number],
					index: number,
				) => (
					<div key={index} className="space-y-2 rounded border p-3">
						<div className="flex gap-2">
							<div className="flex-1">
								<label className="block text-xs font-medium text-gray-700">
									Find
								</label>
								<input
									type="text"
									value={replacement.find}
									onChange={(e) =>
										updateReplacement(index, 'find', e.target.value)
									}
									placeholder="Character(s) to find"
									className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex-1">
								<label className="block text-xs font-medium text-gray-700">
									Replace with
								</label>
								<input
									type="text"
									value={replacement.replace}
									onChange={(e) =>
										updateReplacement(index, 'replace', e.target.value)
									}
									placeholder="Replace with"
									className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700">
								Scope
							</label>
							<select
								value={replacement.scope}
								onChange={(e) =>
									updateReplacement(index, 'scope', e.target.value)
								}
								className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
							>
								<option value="all">All cells</option>
								<option value="specific_columns">Specific columns</option>
								<option value="specific_rows">Specific rows</option>
							</select>
						</div>
						{replacement.scope === 'specific_columns' && (
							<div>
								<label className="block text-xs font-medium text-gray-700">
									Columns (comma-separated, e.g., A, B, C)
								</label>
								<input
									type="text"
									value={replacement.columns?.join(', ') || ''}
									onChange={(e) => handleColumnsChange(index, e.target.value)}
									placeholder="A, B, C"
									className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
								/>
							</div>
						)}
						{replacement.scope === 'specific_rows' && (
							<div>
								<label className="block text-xs font-medium text-gray-700">
									Row numbers (comma-separated, 1-based)
								</label>
								<input
									type="text"
									value={replacement.rows?.join(', ') || ''}
									onChange={(e) => handleRowsChange(index, e.target.value)}
									placeholder="1, 2, 3"
									className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
								/>
							</div>
						)}
						{replacements.length > 1 && (
							<button
								type="button"
								onClick={() => removeReplacement(index)}
								className="text-xs text-red-600 hover:text-red-800"
							>
								Remove
							</button>
						)}
					</div>
				),
			)}
			<button
				type="button"
				onClick={addReplacement}
				className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
			>
				Add Replacement
			</button>
		</div>
	);
}
