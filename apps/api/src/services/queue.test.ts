import { describe, it, expect, vi } from 'vitest';

(process as any).on = vi.fn();

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({ options: {}, disconnect: vi.fn() })),
}));

vi.mock('bull', () => {
  const queueInstance = {
    getJob: vi.fn(),
    add: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    clean: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    getWaiting: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
    on: vi.fn(),
  };
  const Queue = vi.fn(() => queueInstance);
  Queue.__instance = queueInstance;
  return { default: Queue };
});

describe('QueueService', () => {
  it('returns null when job does not exist', async () => {
    const { QueueService } = await import('./queue.js');
    const Queue = (await import('bull')).default as any;
    const queueInstance = Queue.__instance;
    queueInstance.getJob.mockResolvedValue(null);
    const status = await QueueService.getJobStatus('abc');
    expect(status).toBeNull();
  });

  it('removeJob returns false when job missing', async () => {
    const { QueueService } = await import('./queue.js');
    const Queue = (await import('bull')).default as any;
    const queueInstance = Queue.__instance;
    queueInstance.getJob.mockResolvedValue(null);
    const result = await QueueService.removeJob('abc');
    expect(result).toBe(false);
  });
});
