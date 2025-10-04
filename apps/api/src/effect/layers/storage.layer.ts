import { StorageError, StorageService, type UploadResult } from '@mutate/core';
import { Effect, Layer } from 'effect';

import { storageService as existingStorage } from '@/services/storage.js';

const StorageServiceImpl = StorageService.of({
	upload: (key: string, data: Buffer, contentType?: string) =>
		Effect.tryPromise({
			try: async () => {
				// Use uploadTransformedFile for now, adapting the key as needed
				const fileName = key.split('/').pop() || 'file';
				const result = await existingStorage.uploadTransformedFile(
					data,
					fileName,
					'default', // organizationId
					'job-' + Date.now(), // jobId
				);

				return {
					url: result.url,
					key: result.key,
					size: result.size,
				};
			},
			catch: (error) =>
				new StorageError({
					op: 'upload',
					key,
					cause: error,
				}),
		}),

	get: (key: string) =>
		Effect.tryPromise({
			try: async () => {
				// For now, we don't have a direct download method
				// This would need to be implemented based on the storage provider
				throw new Error('Direct download not yet implemented');
			},
			catch: (error) =>
				new StorageError({
					op: 'download',
					key,
					cause: error,
				}),
		}),

	signGet: (key: string, expiresInSeconds: number) =>
		Effect.tryPromise({
			try: async () => {
				const url = await existingStorage.generateFreshPresignedUrl(
					key,
					expiresInSeconds,
				);
				return url;
			},
			catch: (error) =>
				new StorageError({
					op: 'download',
					key,
					cause: error,
				}),
		}),

	remove: (key: string) =>
		Effect.tryPromise({
			try: async () => {
				await existingStorage.deleteFile(key);
			},
			catch: (error) =>
				new StorageError({
					op: 'delete',
					key,
					cause: error,
				}),
		}),

	exists: (key: string) =>
		Effect.tryPromise({
			try: async () => {
				// Check if we can generate a presigned URL for the key
				try {
					await existingStorage.generateFreshPresignedUrl(key, 60);
					return true;
				} catch {
					return false;
				}
			},
			catch: (error) =>
				new StorageError({
					op: 'download',
					key,
					cause: error,
				}),
		}),
});

export const StorageServiceLayer = Layer.succeed(
	StorageService,
	StorageServiceImpl,
);
