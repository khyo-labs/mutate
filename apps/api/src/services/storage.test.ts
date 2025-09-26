import { describe, it, expect, vi } from 'vitest';
import { StorageService } from './storage.js';

describe('StorageService', () => {
  it('uploads transformed file with correct extension and content type', async () => {
    const mockProvider = {
      uploadFile: vi.fn().mockResolvedValue('key'),
      generatePresignedUrl: vi.fn().mockResolvedValue('url'),
      deleteFile: vi.fn(),
    };

    const service = new StorageService();
    (service as any).provider = mockProvider;

    const buffer = Buffer.from('hello');
    const result = await service.uploadTransformedFile(buffer, 'file.csv', 'org', 'job');

    expect(mockProvider.uploadFile).toHaveBeenCalled();
    const [keyArg, bufferArg, contentType] = mockProvider.uploadFile.mock.calls[0];
    expect(keyArg).toMatch(/\.csv$/);
    expect(bufferArg).toBe(buffer);
    expect(contentType).toBe('text/csv');
    expect(result.url).toBe('url');
  });

  it('extractKeyFromUrl returns decoded key', () => {
    const url = 'http://example.com/path/to%20file.txt';
    expect(StorageService.extractKeyFromUrl(url)).toBe('path/to file.txt');
  });
});
