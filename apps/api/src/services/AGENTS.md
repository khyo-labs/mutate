# Services Agent Guide

## Overview

Business logic lives here. Two patterns coexist: traditional class-based singletons and Effect.ts services (in `src/effect/services/`).

## Service Inventory

| File                                       | Pattern                    | Purpose                                    |
| ------------------------------------------ | -------------------------- | ------------------------------------------ |
| `mutate.ts`                                | Class singleton            | Transformation rule engine (ExcelJS-based) |
| `storage.ts`                               | Class singleton            | File storage abstraction (S3/R2/local)     |
| `queue.ts`                                 | Static class + Bull queues | Job queue management                       |
| `webhook.ts`                               | Class singleton            | Legacy webhook delivery                    |
| `webhook-queue.ts`                         | Functions                  | Webhook queue operations                   |
| `workspace.ts`                             | Functions                  | Workspace CRUD operations                  |
| `user.ts`                                  | Functions                  | User profile operations                    |
| `admin/index.ts`                           | Functions                  | Admin utilities                            |
| `admin/audit-service.ts`                   | Class singleton            | Admin audit logging                        |
| `billing/subscription-service.ts`          | Class                      | Plan/subscription lookups                  |
| `billing/quota-enforcement-service.ts`     | Class                      | Quota validation                           |
| `billing/usage-tracking-service.ts`        | Class                      | Monthly usage recording                    |
| `billing/types.ts`                         | Types only                 | Billing type definitions                   |
| `conversion/base-conversion-service.ts`    | Abstract class             | Conversion base class                      |
| `conversion/conversion-service-factory.ts` | Factory                    | Creates format-specific converters         |
| `conversion/xlsx-to-csv-service.ts`        | Class                      | XLSX to CSV conversion                     |
| `conversion/docx-to-pdf-service.ts`        | Class                      | DOCX to PDF conversion                     |
| `conversion/conversion-errors.ts`          | Error classes              | Conversion-specific errors                 |
| `conversion/error-handler.ts`              | Functions                  | Conversion error handling                  |
| `email/index.ts`                           | Functions                  | SendGrid email sending                     |

## Storage Service

`StorageService` is a singleton (`storageService` export) that wraps `StorageProvider` interface:

- `S3StorageProvider` — AWS S3 and Cloudflare R2 (uses `forcePathStyle` for R2)
- `LocalStorageProvider` — Local filesystem (development only)

Provider is selected by `config.STORAGE_TYPE`. R2 credentials take priority over AWS when both are present.

**File key format**: `{type}/{organizationId}/{YYYY-MM-DD}/{jobId}/{ulid}.{ext}`

- Input files: `input/...`
- Output files: `transformed/...`

## Queue Service

Three Bull queues defined in `queue.ts`:

- `transformationQueue` (`file-transformation`) — 3 attempts, 5s exponential backoff
- `webhookDeliveryQueue` (`webhook-delivery`) — 5 attempts, 1s exponential backoff
- `webhookDeadLetterQueue` (`webhook-dead-letter`) — stores permanently failed webhooks

File buffers are base64-encoded for Redis serialization (`QueueJobData.fileData`).

Queue event handlers track billing on job completion/failure.

## Billing Services

Three-service architecture:

1. `QuotaEnforcementService` — validates before processing (file size, concurrent limit, monthly limit)
2. `UsageTrackingService` — records usage after processing (monthly counts, overage tracking)
3. `SubscriptionService` — retrieves plan limits and subscription state

## Mutation Service

`MutationService` applies transformation rules sequentially to an ExcelJS workbook. Supported rules:

- `SELECT_WORKSHEET`, `VALIDATE_COLUMNS`, `UNMERGE_AND_FILL`
- `DELETE_ROWS`, `DELETE_COLUMNS`, `COMBINE_WORKSHEETS`, `EVALUATE_FORMULAS`

Each rule has a dedicated `apply*` method. Execution is logged in an internal `log` array returned with results.

## Webhook Delivery Flow

1. Route handler creates webhook delivery record in DB
2. Job added to `webhookDeliveryQueue`
3. Worker processes: fetches delivery record, makes HTTP request with HMAC-SHA256 signature
4. On failure: exponential backoff retry (up to 5 attempts)
5. After max retries: moved to `webhookDeadLetterQueue`

Webhook headers: `mutate-signature` (HMAC), `Mutate-Timestamp`, `Mutate-Id`, `User-Agent: Mutate-Webhook/1.0`

## Conversion Service Factory

`ConversionServiceFactory.create(inputType, outputType)` returns the appropriate conversion service. Supported pairs defined in `src/converters/index.ts`.
