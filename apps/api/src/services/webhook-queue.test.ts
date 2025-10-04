import { beforeEach, describe, expect, it, vi } from 'vitest';

import { webhookService } from './webhook.js';

vi.mock('../db/connection.js', () => {
	const updateWhereMock = vi.fn().mockResolvedValue(undefined);
	const updateSetMock = vi.fn().mockReturnValue({ where: updateWhereMock });
	const updateMock = vi.fn().mockReturnValue({ set: updateSetMock });
	return {
		db: {
			query: {
				configurations: {
					findFirst: vi.fn().mockResolvedValue({
						webhookUrlId: 'whu_1',
						webhookUrl: {
							id: 'whu_1',
							url: 'http://localhost:8085/webhook/test',
							secret: 's',
						},
					}),
				},
			},
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnThis(),
				onConflictDoNothing: vi.fn(),
			}),
			update: updateMock,
		},
	};
});

vi.mock('../services/queue.js', () => ({
	webhookDeliveryQueue: { add: vi.fn().mockResolvedValue(undefined) },
}));

const { db } = await import('../db/connection.js');
const { webhookDeliveryQueue } = await import('../services/queue.js');

describe('webhookService enqueue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('enqueues a webhook delivery for configuration webhook', async () => {
		const payload = {
			jobId: 'job_1',
			status: 'completed' as const,
			configurationId: 'cfg_1',
			organizationId: 'org_1',
			completedAt: new Date().toISOString(),
		};

		const res = await webhookService.sendWebhookWithPriority(
			'org_1',
			'cfg_1',
			payload as any,
		);

		expect(res).toBeTruthy();
		expect(res?.status).toBe('pending');
		expect(webhookDeliveryQueue.add).toHaveBeenCalled();
		// Ensure jobId equals deliveryId for dedupe
		const args = (webhookDeliveryQueue.add as any).mock.calls[0];
		expect(args[0]).toBe('deliver-webhook');
		const data = args[1];
		const opts = args[2];
		expect(data.deliveryId).toBeTruthy();
		expect(opts.jobId).toEqual(data.deliveryId);
	});
});
