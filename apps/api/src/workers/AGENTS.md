# Workers Agent Guide

## Overview

Background job processors using Bull (Redis-backed queues). Workers are imported as side effects in `src/index.ts` so they start processing when the server starts.

## Worker Files

| File | Queue | Status |
|------|-------|--------|
| `mutation-worker-effect.ts` | `file-transformation` | **Active** (imported in index.ts) |
| `mutation-worker.ts` | `file-transformation` | Legacy (not imported) |
| `webhook-delivery-worker.ts` | `webhook-delivery` | **Active** (imported in index.ts) |
| `webhook-delivery-worker-effect.ts` | `webhook-delivery` | Effect version (not imported) |

Only `mutation-worker-effect.ts` and `webhook-delivery-worker.ts` are imported by the server.

## Mutation Worker (Effect-based)

`mutation-worker-effect.ts` processes `file-transformation` queue jobs:

1. Receives `QueueJobData` with base64-encoded file, configuration ID, organization ID
2. Decodes file buffer from base64
3. Updates job status to `processing` in DB
4. Fetches configuration from DB
5. Uploads input file to storage (if non-local)
6. Runs transformation via `MutationService.transformFile()`
7. Uploads output file to storage
8. Updates job with output file key and download URL
9. Sends webhook notification if configured
10. Has a 5-minute timeout on processing

Uses Effect.ts runtime with DatabaseService, StorageService, WebhookService layers.

## Webhook Delivery Worker

`webhook-delivery-worker.ts` processes `webhook-delivery` queue jobs:

1. Receives `WebhookDeliveryJobData` with `deliveryId`
2. Fetches delivery record from DB (includes URL, payload, secret)
3. Makes HTTP POST with HMAC-SHA256 signature
4. On success: updates delivery status to `success`
5. On failure: updates attempt count, calculates next retry time
6. After max retries: moves job to `webhook-dead-letter` queue

**Security**: Uses constant-time comparison for signature verification to prevent timing attacks.

**Webhook headers**:
```
Content-Type: application/json
User-Agent: Mutate-Webhook/1.0
X-Webhook-Event: transformation.completed
mutate-signature: sha256={hmac}
Mutate-Timestamp: {unix_timestamp}
Mutate-Id: {jobId}
```

## Queue Configuration (from `src/services/queue.ts`)

**Transformation queue**:
- Attempts: 3 (5 for files > 50MB)
- Backoff: exponential, 5s initial delay
- Stalled check: every 30s
- Retention: last 100 completed, 50 failed

**Webhook delivery queue**:
- Attempts: 5 (configurable via `WEBHOOK_MAX_RETRIES`)
- Backoff: exponential, 1s initial delay
- Retention: last 200 completed, 100 failed

**Dead letter queue**:
- Retention: last 500 completed

## Job Data Serialization

File buffers cannot be stored directly in Redis. The `QueueService.addTransformationJob()` method converts `Buffer` to base64 string before enqueuing. Workers decode with `Buffer.from(data.fileData, 'base64')`.

## Adding New Workers

1. Create worker file in `src/workers/`
2. Define queue in `src/services/queue.ts` with appropriate retry config
3. Import worker as side effect in `src/index.ts`: `import './workers/my-worker.js'`
4. Register the queue in the worker file with `queue.process()`
5. Add graceful shutdown for the new queue in `src/index.ts`
