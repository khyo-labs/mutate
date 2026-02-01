import { Data } from 'effect';

export class ConfigNotFound extends Data.TaggedError('ConfigNotFound')<{
	readonly configurationId: string;
}> {}

export class FileLoadError extends Data.TaggedError('FileLoadError')<{
	readonly key: string;
	readonly cause?: unknown;
}> {}

export class TransformError extends Data.TaggedError('TransformError')<{
	readonly rule: string;
	readonly reason: string;
}> {}

export class StorageError extends Data.TaggedError('StorageError')<{
	readonly op: 'upload' | 'download' | 'delete';
	readonly key: string;
	readonly cause?: unknown;
}> {}

export class WebhookError extends Data.TaggedError('WebhookError')<{
	readonly url: string;
	readonly status?: number;
	readonly body?: unknown;
}> {}

export class DbError extends Data.TaggedError('DbError')<{
	readonly op: string;
	readonly cause?: unknown;
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
	readonly field: string;
	readonly message: string;
}> {}

export class RuleApplicationError extends Data.TaggedError('RuleApplicationError')<{
	readonly ruleType: string;
	readonly ruleIndex: number;
	readonly message: string;
}> {}

export class WorksheetNotFoundError extends Data.TaggedError('WorksheetNotFoundError')<{
	readonly sheetName: string;
	readonly availableSheets: string[];
}> {}

export class ParseError extends Data.TaggedError('ParseError')<{
	readonly fileName: string;
	readonly message: string;
}> {}
