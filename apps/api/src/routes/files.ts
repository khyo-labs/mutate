import { FastifyInstance } from 'fastify';
import { access, readFile } from 'fs/promises';
import { join } from 'path';

import { config } from '../config.js';
import { logError } from '../utils/logger.js';

export async function fileRoutes(fastify: FastifyInstance) {
	// Serve files from local storage - using wildcard to capture full path with slashes
	fastify.get('/*', async (request, reply) => {
		const filePath = (request.params as any)['*'];
		const { expires } = request.query as { expires?: string };

		console.log('File request:', { filePath, expires, url: request.url });

		try {
			// Check if file has expired
			if (expires) {
				const expirationTime = parseInt(expires);
				if (Date.now() > expirationTime) {
					return reply.code(410).send({
						success: false,
						error: {
							code: 'FILE_EXPIRED',
							message: 'Download link has expired',
						},
					});
				}
			}

			// Decode the file path
			const decodedPath = decodeURIComponent(filePath);
			
			// Security check: prevent directory traversal
			if (decodedPath.includes('..') || decodedPath.startsWith('/')) {
				return reply.code(403).send({
					success: false,
					error: {
						code: 'INVALID_PATH',
						message: 'Invalid file path',
					},
				});
			}

			// Build full file path
			const fullPath = join(config.STORAGE_PATH, decodedPath);

			// Check if file exists
			try {
				await access(fullPath);
			} catch {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'FILE_NOT_FOUND',
						message: 'File not found',
					},
				});
			}

			// Read and serve the file
			const fileBuffer = await readFile(fullPath);
			
			// Determine content type based on file extension
			const extension = decodedPath.split('.').pop()?.toLowerCase();
			const contentType = getContentType(extension || '');

			// Extract filename for download
			const fileName = decodedPath.split('/').pop() || 'download';

			return reply
				.header('Content-Type', contentType)
				.header('Content-Disposition', `attachment; filename="${fileName}"`)
				.header('Content-Length', fileBuffer.length)
				.send(fileBuffer);

		} catch (error) {
			logError(fastify.log, 'File serve error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'FILE_SERVE_FAILED',
					message: 'Failed to serve file',
				},
			});
		}
	});
}

function getContentType(extension: string): string {
	const contentTypeMap: Record<string, string> = {
		'csv': 'text/csv',
		'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'xls': 'application/vnd.ms-excel',
		'json': 'application/json',
		'txt': 'text/plain',
		'pdf': 'application/pdf',
	};

	return contentTypeMap[extension] || 'application/octet-stream';
}