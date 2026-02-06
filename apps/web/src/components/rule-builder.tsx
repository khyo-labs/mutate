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
	Replace,
	Trash2,
	X,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import React from 'react';

import { useConfigurationStore } from '../stores/config-store';
import type { TransformationRule, XlsxToCsvRuleType } from '../types';
import { RuleParameterForm } from './rule-parameter-form';
import { Button } from './ui/button';

interface RuleBuilderProps {
	rules: TransformationRule[];
	onChange: (rules: TransformationRule[]) => void;
}

const ruleIcons: Record<XlsxToCsvRuleType, React.ComponentType<{ className?: string }>> = {
	SELECT_WORKSHEET: FileText,
	VALIDATE_COLUMNS: CheckCircle,
	UNMERGE_AND_FILL: Merge,
	DELETE_ROWS: Trash2,
	DELETE_COLUMNS: Columns,
	COMBINE_WORKSHEETS: Combine,
	EVALUATE_FORMULAS: Calculator,
	REPLACE_CHARACTERS: Replace,
};

const ruleDescriptions: Record<XlsxToCsvRuleType, string> = {
	SELECT_WORKSHEET: 'Choose which worksheet to process',
	VALIDATE_COLUMNS: 'Check column count matches expected',
	UNMERGE_AND_FILL: 'Unmerge cells and fill empty cells',
	DELETE_ROWS: 'Remove rows by condition',
	DELETE_COLUMNS: 'Remove specific columns',
	COMBINE_WORKSHEETS: 'Merge multiple sheets together',
	EVALUATE_FORMULAS: 'Calculate formula values',
	REPLACE_CHARACTERS: 'Replace specific characters in cell values',
};

interface SortableRuleProps {
	rule: TransformationRule;
	index: number;
	onRemove: (id: string) => void;
	onUpdate: (rule: TransformationRule) => void;
}

function SortableRule({ rule, index, onRemove, onUpdate }: SortableRuleProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: rule.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const Icon = ruleIcons[rule.type];

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`bg-card rounded-lg border p-4 ${isDragging ? 'opacity-50' : ''}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground hover:text-foreground cursor-grab"
						{...attributes}
						{...listeners}
					>
						<GripVertical className="h-4 w-4" />
					</Button>
					<div className="bg-primary/10 shrink-0 rounded-lg p-2">
						<Icon className="text-primary h-4 w-4" />
					</div>
					<div className="flex-1 overflow-hidden">
						<h4 className="text-foreground truncate text-sm font-medium">
							{rule.type.replace(/_/g, ' ')}
						</h4>
						<p className="text-muted-foreground text-xs">{ruleDescriptions[rule.type]}</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="text-muted-foreground text-xs">#{index + 1}</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onRemove(rule.id)}
						className="text-destructive hover:text-destructive/80 p-1"
					>
						<X className="h-4 w-4" />
					</Button>
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

	function handleDragStart(event: DragStartEvent) {
		setActiveId(event.active.id as string);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = rules.findIndex((rule) => rule.id === active.id);
			const newIndex = rules.findIndex((rule) => rule.id === over.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				onChange(arrayMove(rules, oldIndex, newIndex));
			}
		}

		setActiveId(null);
	}

	function addRule(ruleTemplate: TransformationRule) {
		const newRule: TransformationRule = {
			...ruleTemplate,
			id: nanoid(),
		};
		onChange([...rules, newRule]);
	}

	function removeRule(ruleId: string) {
		onChange(rules.filter((rule) => rule.id !== ruleId));
	}

	function updateRule(updatedRule: TransformationRule) {
		onChange(rules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule)));
	}

	return (
		<div className="grid grid-cols-12 gap-6">
			{/* Available Rules */}
			<div className="col-span-4">
				<h3 className="text-foreground mb-4 text-lg font-medium">Available Operations</h3>
				<div className="space-y-2">
					{availableRules.map((rule) => {
						const Icon = ruleIcons[rule.type];
						return (
							<Button
								key={rule.id}
								variant="outline"
								onClick={() => addRule(rule)}
								className="h-auto w-full justify-start overflow-hidden p-3 text-left"
							>
								<div className="flex w-full items-start gap-3">
									<div className="bg-muted shrink-0 rounded-lg p-2">
										<Icon className="text-muted-foreground h-4 w-4" />
									</div>
									<div className="flex-1 overflow-hidden">
										<div className="text-foreground truncate text-sm font-medium">
											{rule.type.replace(/_/g, ' ')}
										</div>
										<div className="text-muted-foreground text-xs leading-relaxed whitespace-normal">
											{ruleDescriptions[rule.type]}
										</div>
									</div>
								</div>
							</Button>
						);
					})}
				</div>
			</div>

			{/* Active Rules */}
			<div className="col-span-8">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-foreground text-lg font-medium">Mutation Pipeline</h3>
					<span className="text-muted-foreground text-sm">
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
						<SortableContext items={rules} strategy={verticalListSortingStrategy}>
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
					<div className="border-border rounded-lg border-2 border-dashed p-12 text-center">
						<Plus className="text-muted-foreground mx-auto h-12 w-12" />
						<h4 className="text-foreground mt-2 text-sm font-medium">No rules added</h4>
						<p className="text-muted-foreground mt-1 text-sm">
							Add transformation rules from the left panel to build your pipeline.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
