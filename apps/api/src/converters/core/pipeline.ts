import { Effect } from 'effect';

import type { Configuration } from '@/types/index.js';

import type { Converter } from './types.js';

export class ConversionPipeline {
	constructor(private steps: Converter[]) {}

	run(
		file: Buffer,
		config?: Configuration,
	): Effect.Effect<Buffer | object | string, Error> {
		return this.steps.reduce<Effect.Effect<Buffer | object | string, Error>>(
			(acc, step) =>
				acc.pipe(
					Effect.flatMap((data) => {
						const buffer = Buffer.isBuffer(data)
							? data
							: Buffer.from(
									typeof data === 'string' ? data : JSON.stringify(data),
								);
						return step.convert(buffer, config);
					}),
				),
			Effect.succeed(file as Buffer | object | string),
		);
	}
}
