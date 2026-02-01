import { Effect } from 'effect';

import type { Configuration } from '@/types/index.js';

export interface ConverterMetadata {
	description: string;
	status: 'supported' | 'in-progress' | 'planned';
	experimental?: boolean;
	costEstimate?: number | null;
	notes?: string;
}

export interface Converter {
	supports(input: string, output: string): boolean;
	convert: (file: Buffer, config?: Configuration) => Effect.Effect<Buffer | object | string, Error>;
	metadata?: ConverterMetadata;
}

export interface ConverterFormat {
	from: string;
	to: string;
	description: string;
	status: 'supported' | 'in-progress' | 'planned';
	experimental?: boolean;
	costEstimate?: number | null;
	notes?: string;
}
