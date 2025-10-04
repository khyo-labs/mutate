import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { billingRoutes } from '../billing.js';

vi.mock('../../../services/billing/index.js', () => {
	class SubscriptionService {
		getAllPlans = vi.fn().mockResolvedValue([{ id: 'plan1' }]);
	}
	class UsageTrackingService {}
	class QuotaEnforcementService {}
	return { SubscriptionService, UsageTrackingService, QuotaEnforcementService };
});

describe('billingRoutes', () => {
	it('returns public plans', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(billingRoutes, { prefix: '/billing' });

		const res = await app.inject({
			method: 'GET',
			url: '/billing/plans/public',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body).toMatchObject({ success: true, data: [{ id: 'plan1' }] });

		await app.close();
	});
});
