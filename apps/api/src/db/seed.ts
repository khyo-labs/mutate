import { db } from './connection.js';
import { subscriptionPlans } from './schema.js';

export const defaultPlans = [
	{
		id: 'plan_free',
		name: 'Free',
		monthlyConversionLimit: 100,
		concurrentConversionLimit: 1,
		maxFileSizeMb: 10,
		priceCents: 0,
		billingInterval: 'month',
		overagePriceCents: null,
		features: {
			apiAccess: true,
			webhooks: false,
			prioritySupport: false,
			customBranding: false,
		},
		active: true,
	},
	{
		id: 'plan_starter',
		name: 'Starter',
		monthlyConversionLimit: 1000,
		concurrentConversionLimit: 2,
		maxFileSizeMb: 25,
		priceCents: 2900, // $29/month
		billingInterval: 'month',
		overagePriceCents: 5, // $0.05 per conversion
		features: {
			apiAccess: true,
			webhooks: true,
			prioritySupport: false,
			customBranding: false,
		},
		active: true,
	},
	{
		id: 'plan_pro',
		name: 'Pro',
		monthlyConversionLimit: 10000,
		concurrentConversionLimit: 5,
		maxFileSizeMb: 50,
		priceCents: 9900, // $99/month
		billingInterval: 'month',
		overagePriceCents: 3, // $0.03 per conversion
		features: {
			apiAccess: true,
			webhooks: true,
			prioritySupport: true,
			customBranding: true,
			customRules: true,
		},
		active: true,
	},
	{
		id: 'plan_enterprise',
		name: 'Enterprise',
		monthlyConversionLimit: null, // unlimited
		concurrentConversionLimit: null, // unlimited
		maxFileSizeMb: null, // unlimited
		priceCents: 29900, // $299/month
		billingInterval: 'month',
		overagePriceCents: null,
		features: {
			apiAccess: true,
			webhooks: true,
			prioritySupport: true,
			customBranding: true,
			customRules: true,
			onPremise: true,
			sla: true,
		},
		active: true,
	},
];

async function seedPlans() {
	console.log('🌱 Seeding subscription plans...');

	for (const plan of defaultPlans) {
		try {
			await db.insert(subscriptionPlans).values(plan).onConflictDoNothing();
			console.log(`✅ Seeded plan: ${plan.name}`);
		} catch (error) {
			console.error(`❌ Failed to seed plan ${plan.name}:`, error);
		}
	}

	console.log('🎉 Subscription plans seeded successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	seedPlans()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('Seed failed:', error);
			process.exit(1);
		});
}

export { seedPlans };
