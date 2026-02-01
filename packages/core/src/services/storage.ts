import { Context, Effect } from 'effect';

import { StorageError } from '../errors.js';

export interface UploadResult {
	url: string;
	key: string;
	size: number;
}

export interface StorageService {
	upload: (
		key: string,
		data: Buffer,
		contentType?: string,
	) => Effect.Effect<UploadResult, StorageError>;

	get: (key: string) => Effect.Effect<Buffer, StorageError>;

	signGet: (key: string, expiresInSeconds: number) => Effect.Effect<string, StorageError>;

	remove: (key: string) => Effect.Effect<void, StorageError>;

	exists: (key: string) => Effect.Effect<boolean, StorageError>;
}

export const StorageService = Context.GenericTag<StorageService>('@mutate/core/StorageService');
