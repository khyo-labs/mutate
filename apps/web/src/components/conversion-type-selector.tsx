import {
	FileBarChart,
	FileJson,
	FileSpreadsheet,
	FileText,
	Globe,
} from 'lucide-react';

import type { ConversionType } from '@/types';

interface ConversionTypeInfo {
	type: ConversionType;
	name: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	inputFormat: string;
	outputFormat: string;
	available: boolean;
}

const conversionTypes: ConversionTypeInfo[] = [
	{
		type: 'XLSX_TO_CSV',
		name: 'Excel to CSV',
		description: 'Transform XLSX spreadsheets to CSV format with custom rules',
		icon: FileSpreadsheet,
		inputFormat: 'XLSX',
		outputFormat: 'CSV',
		available: true,
	},
	{
		type: 'DOCX_TO_PDF',
		name: 'Word to PDF',
		description: 'Convert DOCX documents to PDF format',
		icon: FileText,
		inputFormat: 'DOCX',
		outputFormat: 'PDF',
		available: false,
	},
	{
		type: 'HTML_TO_PDF',
		name: 'HTML to PDF',
		description: 'Convert HTML pages to PDF documents',
		icon: Globe,
		inputFormat: 'HTML',
		outputFormat: 'PDF',
		available: false,
	},
	{
		type: 'PDF_TO_CSV',
		name: 'PDF to CSV',
		description: 'Extract tables from PDF files to CSV format',
		icon: FileBarChart,
		inputFormat: 'PDF',
		outputFormat: 'CSV',
		available: false,
	},
	{
		type: 'JSON_TO_CSV',
		name: 'JSON to CSV',
		description: 'Flatten JSON data into CSV format',
		icon: FileJson,
		inputFormat: 'JSON',
		outputFormat: 'CSV',
		available: false,
	},
	{
		type: 'CSV_TO_JSON',
		name: 'CSV to JSON',
		description: 'Transform CSV data into structured JSON',
		icon: FileJson,
		inputFormat: 'CSV',
		outputFormat: 'JSON',
		available: false,
	},
];

interface ConversionTypeSelectorProps {
	selectedType?: ConversionType;
	onTypeSelect: (type: ConversionType) => void;
	className?: string;
}

export function ConversionTypeSelector({
	selectedType,
	onTypeSelect,
	className = '',
}: ConversionTypeSelectorProps) {
	return (
		<div className={`space-y-4 ${className}`}>
			<div>
				<h3 className="text-foreground text-lg font-semibold">
					Choose Conversion Type
				</h3>
				<p className="text-muted-foreground mt-1 text-sm">
					Select what type of file transformation you want to create
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{conversionTypes.map((conversion) => {
					const Icon = conversion.icon;
					const isSelected = selectedType === conversion.type;
					const isDisabled = !conversion.available;

					return (
						<div
							key={conversion.type}
							onClick={() => {
								if (!isDisabled) {
									onTypeSelect(conversion.type);
								}
							}}
							className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
								isSelected
									? 'border-primary bg-primary/10 ring-primary/20 ring-2'
									: 'border-border hover:border-border/80 hover:bg-muted/50'
							} ${
								isDisabled
									? 'bg-muted cursor-not-allowed opacity-50'
									: 'hover:shadow-md'
							} `}
						>
							{isDisabled && (
								<div className="absolute right-2 top-2">
									<span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
										Coming Soon
									</span>
								</div>
							)}

							<div className="flex items-start space-x-3">
								<div
									className={`flex-shrink-0 rounded-lg p-2 ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'} `}
								>
									<Icon className="h-6 w-6" />
								</div>

								<div className="min-w-0 flex-1">
									<h4
										className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'} `}
									>
										{conversion.name}
									</h4>
									<p className="text-muted-foreground mt-1 text-xs">
										{conversion.description}
									</p>
									<div className="mt-2 flex items-center space-x-2">
										<span className="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-1 text-xs font-medium">
											{conversion.inputFormat}
										</span>
										<span className="text-muted-foreground">→</span>
										<span className="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-1 text-xs font-medium">
											{conversion.outputFormat}
										</span>
									</div>
								</div>
							</div>

							{isSelected && (
								<div className="ring-primary pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset"></div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
