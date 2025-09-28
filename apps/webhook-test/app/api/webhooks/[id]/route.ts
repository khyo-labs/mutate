import { NextRequest, NextResponse } from 'next/server';

import { webhookStore } from '@/lib/webhook-store';

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	const webhook = webhookStore.getWebhook(params.id);

	if (!webhook) {
		return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
	}

	return NextResponse.json(webhook);
}
