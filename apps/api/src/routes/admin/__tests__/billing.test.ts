import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { adminBillingRoutes } from '../billing.js';

vi.mock('../../../middleware/auth.js', () => ({
	requireAdmin: vi.fn(async () => {}),
}));
vi.mock('../../../services/billing/index.js', () => {
	class SubscriptionService {
		getAllPlans = vi.fn().mockResolvedValue([{ id: 'p1' }]);
	}
	class QuotaEnforcementService {}
	return { SubscriptionService, QuotaEnforcementService };
});

describe('adminBillingRoutes', () => {
	it('lists all plans', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(adminBillingRoutes, { prefix: '/admin/billing' });

		const res = await app.inject({
			method: 'GET',
			url: '/admin/billing/plans',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.data).toEqual([{ id: 'p1' }]);

		await app.close();
	});
});
