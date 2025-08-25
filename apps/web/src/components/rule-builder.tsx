import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Calculator,
	CheckCircle,
	Columns,
	Combine,
	FileText,
	GripVertical,
	Merge,
	Plus,
	Trash2,
	X,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import React from 'react';

import { useConfigurationStore } from '../stores/config-store';
import type { RuleType, TransformationRule } from '../types';
import { RuleParameterForm } from './rule-parameter-form';

interface RuleBuilderProps {
	rules: TransformationRule[];
	onChange: (rules: TransformationRule[]) => void;
}

const ruleIcons: Record<RuleType, React.ComponentType<any>> = {
	SELECT_WORKSHEET: FileText,
	VALIDATE_COLUMNS: CheckCircle,
	UNMERGE_AND_FILL: Merge,
	DELETE_ROWS: Trash2,
	DELETE_COLUMNS: Columns,
	COMBINE_WORKSHEETS: Combine,
	EVALUATE_FORMULAS: Calculator,
};

const ruleDescriptions: Record<RuleType, string> = {
	SELECT_WORKSHEET: 'Select a specific worksheet to work with',
	VALIDATE_COLUMNS: 'Validate the expected number of columns',
	UNMERGE_AND_FILL: 'Unmerge cells and fill values down or up',
	DELETE_ROWS: 'Delete rows based on content conditions',
	DELETE_COLUMNS: 'Remove specified columns from the worksheet',
	COMBINE_WORKSHEETS: 'Combine multiple worksheets into one',
	EVALUATE_FORMULAS: 'Calculate and replace formulas with values',
};

interface SortableRuleProps {
	rule: TransformationRule;
	index: number;
	onRemove: (id: string) => void;
	onUpdate: (rule: TransformationRule) => void;
}

function SortableRule({ rule, index, onRemove, onUpdate }: SortableRuleProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: rule.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const Icon = ruleIcons[rule.type];

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`rounded-lg border border-gray-200 bg-white p-4 ${
				isDragging ? 'opacity-50' : ''
			}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<button
						className="cursor-grab text-gray-400 hover:text-gray-600"
						{...attributes}
						{...listeners}
					>
						<GripVertical className="h-4 w-4" />
					</button>
					<div className="bg-primary-100 rounded-lg p-2">
						<Icon className="text-primary-600 h-4 w-4" />
					</div>
					<div>
						<h4 className="text-sm font-medium text-gray-900">
							{rule.type.replace(/_/g, ' ')}
						</h4>
						<p className="text-xs text-gray-500">
							{ruleDescriptions[rule.type]}
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<span className="text-xs text-gray-400">#{index + 1}</span>
					<button
						onClick={() => onRemove(rule.id)}
						className="text-red-400 hover:text-red-600"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Rule parameter configuration */}
			<RuleParameterForm rule={rule} onChange={onUpdate} />
		</div>
	);
}

export function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
	const { availableRules } = useConfigurationStore();
	const [, setActiveId] = React.useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = rules.findIndex((rule) => rule.id === active.id);
			const newIndex = rules.findIndex((rule) => rule.id === over.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				onChange(arrayMove(rules, oldIndex, newIndex));
			}
		}

		setActiveId(null);
	};

	const addRule = (ruleTemplate: TransformationRule) => {
		const newRule: TransformationRule = {
			...ruleTemplate,
			id: nanoid(),
		};
		onChange([...rules, newRule]);
	};

	const removeRule = (ruleId: string) => {
		onChange(rules.filter((rule) => rule.id !== ruleId));
	};

	const updateRule = (updatedRule: TransformationRule) => {
		onChange(
			rules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule)),
		);
	};

	return (
		<div className="grid grid-cols-12 gap-6">
			{/* Available Rules */}
			<div className="col-span-4">
				<h3 className="mb-4 text-lg font-medium text-gray-900">
					Available Rules
				</h3>
				<div className="space-y-2">
					{availableRules.map((rule) => {
						const Icon = ruleIcons[rule.type];
						return (
							<button
								key={rule.id}
								onClick={() => addRule(rule)}
								className="hover:border-primary-300 w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
							>
								<div className="flex items-center space-x-3">
									<div className="rounded-lg bg-gray-100 p-2">
										<Icon className="h-4 w-4 text-gray-600" />
									</div>
									<div>
										<div className="text-sm font-medium text-gray-900">
											{rule.type.replace(/_/g, ' ')}
										</div>
										<div className="text-xs text-gray-500">
											{ruleDescriptions[rule.type]}
										</div>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Active Rules */}
			<div className="col-span-8">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-medium text-gray-900">
						Transformation Pipeline
					</h3>
					<span className="text-sm text-gray-500">
						{rules.length} rule{rules.length !== 1 ? 's' : ''}
					</span>
				</div>

				{rules.length > 0 ? (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={rules}
							strategy={verticalListSortingStrategy}
						>
							<div className="space-y-3">
								{rules.map((rule, index) => (
									<SortableRule
										key={rule.id}
										rule={rule}
										index={index}
										onRemove={removeRule}
										onUpdate={updateRule}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				) : (
					<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
						<Plus className="mx-auto h-12 w-12 text-gray-400" />
						<h4 className="mt-2 text-sm font-medium text-gray-900">
							No rules added
						</h4>
						<p className="mt-1 text-sm text-gray-500">
							Add transformation rules from the left panel to build your
							pipeline.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
