import { NextRequest, NextResponse } from 'next/server';

import { webhookStore } from '@/lib/webhook-store';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const webhook = webhookStore.getWebhook(id);

	if (!webhook) {
		return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
	}

	return NextResponse.json(webhook);
}
