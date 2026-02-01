import { Duration, Effect, Schedule } from 'effect';
import * as XLSX from 'xlsx';

import { TransformError } from '../errors.js';
import { DatabaseService, LoggerService, StorageService } from '../services/index.js';
import type { Configuration } from '../types.js';
import { applyRule } from './applyRule.js';
import { parseWorkbook } from './parseWorkbook.js';
import { toCsv } from './toCsv.js';
import type { TransformationResult, TransformationState } from './types.js';

export * from './types.js';
export { parseWorkbook } from './parseWorkbook.js';
export { toCsv } from './toCsv.js';

/**
 * Transform a file from storage using a configuration
 */
export function transformFile(fileKey: string, configurationId: string) {
	return Effect.gen(function* () {
		const startTime = Date.now();
		const db = yield* DatabaseService;
		const storage = yield* StorageService;
		const logger = yield* LoggerService;

		yield* logger.info('Starting file transformation', {
			fileKey,
			configurationId,
		});

		// Get configuration
		const config = yield* db.getConfiguration(configurationId).pipe(
			Effect.catchTag('ConfigNotFound', (error) =>
				Effect.fail(
					new TransformError({
						rule: 'init',
						reason: `Configuration ${error.configurationId} not found`,
					}),
				),
			),
		);

		// Get file from storage
		const fileBuffer = yield* storage.get(fileKey).pipe(
			Effect.catchTag('StorageError', (error) =>
				Effect.fail(
					new TransformError({
						rule: 'init',
						reason: `Failed to load file: ${error.key}`,
					}),
				),
			),
		);

		// Parse workbook
		const workbook = yield* parseWorkbook(fileBuffer, fileKey);

		// Initialize state
		const initialState: TransformationState = {
			workbook,
			selectedSheet: null,
			history: [],
			metadata: {
				rowsProcessed: 0,
				columnsProcessed: 0,
				sheetsProcessed: 0,
			},
		};

		// Apply rules sequentially
		let finalState = initialState;
		for (let index = 0; index < config.rules.length; index++) {
			const rule = config.rules[index];
			finalState = yield* applyRule(finalState, rule, index).pipe(
				Effect.tapError((error) =>
					logger.error(`Rule ${index + 1} failed`, error, {
						ruleType: rule.type,
						ruleId: rule.id,
					}),
				),
			);
		}

		// Convert to CSV
		const csvData = yield* toCsv(
			finalState.workbook,
			finalState.selectedSheet,
			config.outputFormat,
		);

		const processingTimeMs = Date.now() - startTime;
		const executionLog = yield* logger
			.getLog()
			.pipe(Effect.map((logs) => logs.map((l) => `${l.timestamp.toISOString()}: ${l.message}`)));

		yield* logger.info('Transformation completed', {
			processingTimeMs,
			outputSize: csvData.length,
		});

		const result: TransformationResult = {
			success: true,
			csvData,
			executionLog,
			metadata: {
				rowCount: finalState.metadata.rowsProcessed,
				columnCount: finalState.metadata.columnsProcessed,
				processingTimeMs,
			},
		};

		return result;
	}).pipe(
		Effect.retry(
			Schedule.exponential(Duration.millis(250), 2).pipe(
				Schedule.jittered,
				Schedule.compose(Schedule.recurs(3)),
			),
		),
		Effect.withSpan('transformFile'),
	);
}

/**
 * Transform a buffer directly (for preview functionality in browser)
 */
export function transformBuffer(buffer: Buffer, configuration: Configuration, maxRows?: number) {
	return Effect.gen(function* () {
		const startTime = Date.now();
		const logger = yield* LoggerService;

		yield* logger.info('Starting buffer transformation', {
			bufferSize: buffer.length,
			configName: configuration.name,
			maxRows,
		});

		// Parse workbook
		const workbook = yield* parseWorkbook(buffer, 'preview');

		// Limit rows for preview if specified
		if (maxRows) {
			for (const sheetName of workbook.SheetNames) {
				const sheet = workbook.Sheets[sheetName];
				if (sheet['!ref']) {
					const range = XLSX.utils.decode_range(sheet['!ref']);
					if (range.e.r > maxRows) {
						range.e.r = maxRows - 1;
						sheet['!ref'] = XLSX.utils.encode_range(range);
					}
				}
			}
		}

		// Initialize state
		const initialState: TransformationState = {
			workbook,
			selectedSheet: null,
			history: [],
			metadata: {
				rowsProcessed: 0,
				columnsProcessed: 0,
				sheetsProcessed: 0,
			},
		};

		// Apply rules
		let finalState = initialState;
		for (let index = 0; index < configuration.rules.length; index++) {
			const rule = configuration.rules[index];
			finalState = yield* applyRule(finalState, rule, index);
		}

		// Convert to CSV
		const csvData = yield* toCsv(
			finalState.workbook,
			finalState.selectedSheet,
			configuration.outputFormat,
		);

		const processingTimeMs = Date.now() - startTime;
		const executionLog = yield* logger
			.getLog()
			.pipe(Effect.map((logs) => logs.map((l) => `${l.timestamp.toISOString()}: ${l.message}`)));

		const result: TransformationResult = {
			success: true,
			csvData,
			executionLog,
			metadata: {
				rowCount: finalState.metadata.rowsProcessed,
				columnCount: finalState.metadata.columnsProcessed,
				processingTimeMs,
			},
		};

		return result;
	}).pipe(Effect.withSpan('transformBuffer'));
}
