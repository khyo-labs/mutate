import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { webhookStore } from '@/lib/webhook-store';

const ConfigSchema = z.object({
	responseStatus: z.number().min(100).max(599).default(200),
	responseDelay: z.number().min(0).max(30000).default(0),
	failAfterAttempts: z.number().min(0).default(0),
	attemptCounts: z.array(z.tuple([z.string(), z.number()])).optional(),
	simulateTimeout: z.boolean().default(false),
	requireSignature: z.boolean().default(false),
	expectedSignature: z.string().default(''),
	webhookSecret: z.string().default('test-secret-key'),
	verifyHmac: z.boolean().default(false),
	returnCustomBody: z.boolean().default(false),
	customBody: z.any().default({ message: 'OK' }),
});

export async function GET() {
	const config = webhookStore.getConfig();
	return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = ConfigSchema.parse(body);

		// Convert attemptCounts array to Map if present
		const configWithMap = {
			...parsed,
			attemptCounts: parsed.attemptCounts
				? new Map(parsed.attemptCounts)
				: undefined,
		};

		const config = webhookStore.updateConfig(configWithMap);

		return NextResponse.json({
			success: true,
			config,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: 'Invalid configuration',
					details: error.errors,
				},
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{
				error: 'Invalid request',
			},
			{ status: 400 },
		);
	}
}
