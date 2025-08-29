# Implementation Plan: Conversion Queue + Cloud Storage + Webhooks

## Overview
Adding asynchronous file processing queue with cloud storage and webhook notifications for the Mutate platform.

## Phase 1: Queue Infrastructure Setup

### 1. Create queue service (`apps/api/src/services/queue.ts`)
- Initialize Bull queue with Redis connection
- Define job types and processors for file transformation
- Add job status tracking and error handling

### 2. Create background worker (`apps/api/src/workers/transformation-worker.ts`)
- Process queued transformation jobs
- Handle job lifecycle (pending → processing → completed/failed)
- Update database job records with status
- **Send webhook notifications on job completion**

## Phase 2: Cloud Storage Integration

### 3. Create storage service (`apps/api/src/services/storage.ts`)
- Support both AWS S3 and Cloudflare R2 (S3-compatible API)
- Handle file uploads and presigned URL generation
- Abstract storage interface to support multiple providers

### 4. Add cloud storage configuration
- Extend existing config.ts with R2/additional S3 options
- Add environment variables for Cloudflare R2 credentials
- Add presigned URL expiration settings

## Phase 3: Webhook System

### 5. Create webhook service (`apps/api/src/services/webhook.ts`)
- Send HTTP POST notifications to configured webhook URLs
- Include job status, download URLs, and execution logs
- Handle webhook retry logic for failed deliveries
- Add webhook signature verification for security

### 6. Update database schema
- Add `webhookUrl` field to `transformationJobs` table
- Add `webhookUrl` field to `configurations` table (default webhook)
- Add webhook delivery tracking fields (attempts, last_attempt, etc.)

## Phase 4: Integration & API Updates

### 7. Update transformation route (`apps/api/src/routes/transform.ts`)
- Accept optional `webhookUrl` parameter in transform requests
- Queue large files instead of processing synchronously
- Store webhook URL with job record
- Return job ID for status tracking

### 8. Update configuration routes (`apps/api/src/routes/configuration.ts`)
- Add `webhookUrl` field to configuration create/update schemas
- Allow users to set default webhook URLs per configuration

### 9. Update transformation service (`apps/api/src/services/transform.ts`)
- Save output files to cloud storage instead of returning inline data
- Generate presigned download URLs with expiration
- Update job records with storage URLs

### 10. Add download endpoint
- Create endpoint for generating fresh presigned URLs
- Add access control and expiration handling

## Phase 5: Database & Infrastructure

### 11. Database migration
- Add webhook-related columns to existing tables
- Add indexes for job status and webhook queries

### 12. Add queue monitoring
- Create endpoints for queue health/stats
- Add job retry logic and dead letter handling

## Webhook Payload Format

```json
{
  "jobId": "01HXXX...",
  "status": "completed|failed",
  "configurationId": "01HXXX...",
  "downloadUrl": "https://...",
  "expiresAt": "2024-01-01T00:00:00Z",
  "executionLog": [...],
  "error": "...", // if failed
  "completedAt": "2024-01-01T00:00:00Z"
}
```

## Technology Recommendations

- **Cloudflare R2** for storage (cost-effective, S3-compatible)
- **AWS SDK v3** works with both S3 and R2
- **Bull** for job queue (already installed)
- **Webhook security**: HMAC signatures using shared secret
- **Presigned URL expiration**: 24-48 hours (configurable)
- **Webhook retry**: Exponential backoff, max 5 attempts

## Files to Create/Modify

### New Files
- `apps/api/src/services/queue.ts`
- `apps/api/src/services/storage.ts`
- `apps/api/src/services/webhook.ts`
- `apps/api/src/workers/transformation-worker.ts`
- Database migration for webhook columns

### Existing Files to Update
- `apps/api/src/config.ts` (extend with cloud storage and webhook config)
- `apps/api/src/routes/transform.ts` (add webhook URL support, queue integration)
- `apps/api/src/routes/configuration.ts` (add default webhook URL support)
- `apps/api/src/services/transform.ts` (cloud storage integration)
- `apps/api/src/db/schema.ts` (add webhook fields)
- `apps/api/src/index.ts` (queue initialization)

## Implementation Order

1. **Queue Service** - Set up Bull queue infrastructure
2. **Storage Service** - Implement cloud storage abstraction
3. **Database Updates** - Add webhook fields and migration
4. **Webhook Service** - Create notification system
5. **Worker Implementation** - Background job processor
6. **API Integration** - Update routes to use queue and webhooks
7. **Testing & Monitoring** - Add queue health endpoints

## Configuration Requirements

### Environment Variables to Add
```bash
# Cloudflare R2 (optional, can use AWS S3 instead)
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_REGION=auto
CLOUDFLARE_R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com

# Webhooks
WEBHOOK_SECRET=your-webhook-signing-secret
WEBHOOK_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=5
```