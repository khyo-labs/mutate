import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

import { WebhookService } from './webhook.js';

describe('WebhookService', () => {
  it('verifies signatures correctly', () => {
    const payload = JSON.stringify({ hello: 'world' });
    const secret = 'topsecret';
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    const fullSig = `sha256=${sig}`;
    expect(WebhookService.verifySignature(payload, fullSig, secret)).toBe(true);
    expect(WebhookService.verifySignature(payload, 'sha256=bad', secret)).toBe(false);
  });

  it('validates webhook URLs', () => {
    expect(WebhookService.validateWebhookUrl('https://example.com').valid).toBe(true);
    expect(WebhookService.validateWebhookUrl('ftp://example.com').valid).toBe(false);
  });

  it('creates job completed payload', () => {
    const payload = WebhookService.createJobCompletedPayload({
      jobId: '1',
      configurationId: '2',
      organizationId: '3',
      status: 'completed',
    });
    expect(payload.jobId).toBe('1');
    expect(payload.status).toBe('completed');
    expect(payload.completedAt).toBeTruthy();
  });
});
