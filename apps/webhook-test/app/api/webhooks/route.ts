import { NextRequest, NextResponse } from 'next/server';

import { webhookStore } from '@/lib/webhook-store';

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const limit = parseInt(searchParams.get('limit') || '10');
	const offset = parseInt(searchParams.get('offset') || '0');

	const result = webhookStore.getWebhooks(limit, offset);
	return NextResponse.json(result);
}

export async function DELETE() {
	const count = webhookStore.clearWebhooks();

	return NextResponse.json({
		cleared: count,
		timestamp: new Date().toISOString(),
	});
}
