import { NextRequest, NextResponse } from 'next/server';

import { webhookStore } from '@/lib/webhook-store';

export async function POST(
	request: NextRequest,
	{ params }: { params: { path?: string[] } },
) {
	return handleWebhook(request, 'POST', params.path || []);
}

async function handleWebhook(
	request: NextRequest,
	method: string,
	pathSegments: string[],
) {
	const startTime = Date.now();
	const path = `/webhook/${pathSegments.join('/')}`;
	const config = webhookStore.getConfigRaw();

	// Track attempt count
	const attemptKey = `${method}-${path}`;
	const attemptCount = webhookStore.incrementAttempt(attemptKey);

	// Check if should fail after N attempts
	if (
		config.failAfterAttempts > 0 &&
		attemptCount <= config.failAfterAttempts
	) {
		console.log(
			`Simulating failure for attempt ${attemptCount}/${config.failAfterAttempts}`,
		);
		return NextResponse.json(
			{
				error: 'Simulated failure',
				attempt: attemptCount,
				failAfter: config.failAfterAttempts,
			},
			{ status: 500 },
		);
	}

	// Simulate delay if configured
	if (config.responseDelay > 0) {
		await new Promise((resolve) => setTimeout(resolve, config.responseDelay));
	}

	// Check if should timeout
	if (config.simulateTimeout) {
		// Keep the connection open without responding
		await new Promise(() => {}); // Never resolves
	}

	// Parse body
	let body: any = null;
	const contentType = request.headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		try {
			body = await request.json();
		} catch (e) {
			body = null;
		}
	} else if (contentType.includes('text/')) {
		body = await request.text();
	} else if (method !== 'GET' && method !== 'DELETE') {
		try {
			body = await request.text();
			// Try to parse as JSON
			try {
				body = JSON.parse(body);
			} catch {
				// Keep as text
			}
		} catch {
			body = null;
		}
	}

	// Get headers
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key] = value;
	});

	// Extract special headers
	const signature =
		headers['mutate-signature'] ||
		headers['x-webhook-signature'] ||
		headers['x-hub-signature-256'];
	const event = headers['x-webhook-event'];

	// Check signature if required
	if (config.requireSignature && config.expectedSignature) {
		if (signature !== config.expectedSignature) {
			return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
		}
	}

	// HMAC verification
	let hmacValid: boolean | null = null;
	if (config.verifyHmac && signature) {
		const rawBody =
			typeof body === 'object' ? JSON.stringify(body) : String(body);
		hmacValid = webhookStore.verifySignature(
			rawBody,
			signature,
			config.webhookSecret,
		);

		if (!hmacValid) {
			console.log('Webhook signature verification failed');
			return NextResponse.json(
				{ error: 'Invalid webhook signature' },
				{ status: 401 },
			);
		}
	}

	// Get query params
	const query: Record<string, string> = {};
	request.nextUrl.searchParams.forEach((value, key) => {
		query[key] = value;
	});

	// Create webhook data
	const webhookData = {
		id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		method,
		path,
		headers,
		body,
		query,
		attemptCount,
		signature,
		hmacValid,
		event,
		ip:
			request.headers.get('x-forwarded-for') ||
			request.headers.get('x-real-ip') ||
			'unknown',
		jobId: body?.jobId,
		status: body?.status,
		uid: body?.uid,
		processingTime: Date.now() - startTime,
	};

	// Store webhook
	webhookStore.addWebhook(webhookData);

	// Log webhook
	console.log(`Webhook received: ${method} ${path} (attempt ${attemptCount})`);
	if (body?.jobId) {
		console.log(`Transformation job ${body.status}: ${body.jobId}`);
	}

	// Return configured response
	const responseBody = config.returnCustomBody
		? config.customBody
		: {
				received: true,
				id: webhookData.id,
				timestamp: webhookData.timestamp,
				processingTime: webhookData.processingTime,
			};

	return NextResponse.json(responseBody, { status: config.responseStatus });
}
