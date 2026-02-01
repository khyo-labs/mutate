# Effect Integration Plan for Mutate

## Overview

[Effect](https://effect.website/) is a powerful TypeScript library that provides a robust foundation for **type-safe, composable, and resilient applications**.
Integrating Effect into Mutate will dramatically improve reliability, testability, and maintainability across the backend—especially for long-running async operations (file transformations, job processing, and webhooks).

---

## Current Pain Points

### 1. Error Handling

- String-based errors lose type and context
- Inconsistent try/catch handling
- No typed recovery or fallback strategies
- No correlation between errors and failing operations

### 2. Async Operations

- Manual retry logic with `setTimeout`
- No backoff or jitter
- Resource leaks on cancellation/failure
- Job orchestration scattered between modules

### 3. Dependency Management

- Services are manually instantiated
- No DI or resource cleanup
- Tests depend on real services

### 4. Validation

- Zod validation is separate from execution logic
- Validation errors not type-safe
- Duplication between schema and runtime data checks

---

## How Effect Addresses These

- **Typed errors**: replace `throw` with tagged `Effect.fail`
- **Retry policies**: exponential, jittered, and circuit-breaker retries
- **Dependency injection**: via `Layer` and `Context.Tag`
- **Automatic cleanup**: through `acquireUseRelease`
- **Unified async model**: one primitive for all operations (`Effect`)
- **Composability**: easy orchestration across DB, storage, and webhooks

---

## Implementation Plan

### Phase 1 — Core Infrastructure (Weeks 1–2)

#### 1.1 Dependencies

````bash
pnpm api add effect @effect/schema @effect/platform @effect/platform-node @effect/opentelemetry

1.2 Directory Layout

packages/
  core/
    src/
      index.ts
      errors.ts
      transform/
        index.ts
        applyRule.ts
        parseWorkbook.ts
      rules/
        selectWorksheet.ts
        deleteRows.ts
        validateColumns.ts
        ...
      schema/
        configuration.ts
      services/
        storage.ts      # optional — pure interface (no AWS SDK)
        database.ts     # optional — pure interface (for Effect layering)
apps/api/
  src/effect/
    layers/
      drizzle.layer.ts
      storage.layer.ts
    runtime.ts
    adapters/
      fastify.ts
      bull.ts

1.3 Typed Errors

```typescript
// packages/core/src/errors.ts
import { Data } from "effect";

export class ConfigNotFound extends Data.TaggedError("ConfigNotFound")<{ configurationId: string }>{}
export class FileLoadError extends Data.TaggedError("FileLoadError")<{ key: string; cause?: unknown }>{}
export class TransformError extends Data.TaggedError("TransformError")<{ rule: string; reason: string }>{}
export class StorageError extends Data.TaggedError("StorageError")<{ op: "upload" | "download" | "delete"; key: string; cause?: unknown }>{}
export class WebhookError extends Data.TaggedError("WebhookError")<{ url: string; status?: number; body?: unknown }>{}
export class DbError extends Data.TaggedError("DbError")<{ op: string; cause?: unknown }>{}
````

1.4 Service Tags
Database

```typescript
// packages/core/src/Services/Database.ts
import { Context, Effect } from 'effect';

import { ConfigNotFound, DbError } from '../errors';

export interface DatabaseService {
	getConfiguration: (id: string) => Effect.Effect<Configuration, ConfigNotFound | DbError>;
	updateJobStatus: (id: string, status: JobStatus, meta?: unknown) => Effect.Effect<void, DbError>;
}

export const DatabaseService = Context.Tag<DatabaseService>('DatabaseService');
```

Storage

```typescript
// packages/core/src/services/storage.ts
import { Context, Effect } from 'effect';

import { StorageError } from '../errors';

export interface StorageService {
	upload: (
		key: string,
		data: Buffer,
		contentType?: string,
	) => Effect.Effect<{ url: string }, StorageError>;
	get: (key: string) => Effect.Effect<Buffer, StorageError>;
	signGet: (key: string, expires: number) => Effect.Effect<string, StorageError>;
	remove: (key: string) => Effect.Effect<void, StorageError>;
}

export const StorageService = Context.Tag<StorageService>('StorageService');
```

Phase 2 — Core Migration
2.1 Transform Engine

```typescript
// packages/core/src/transform.ts
import { Effect, Schedule } from 'effect';

import { DatabaseService } from './Services/Database';
import { StorageService } from './Services/Storage';
import { ConfigNotFound, TransformError } from './errors';

export const transformFile = (fileKey: string, configurationId: string) =>
	Effect.gen(function* (_) {
		const db = yield* _(DatabaseService);
		const storage = yield* _(StorageService);

		const config = yield* _(db.getConfiguration(configurationId));
		const file = yield* _(storage.get(fileKey));

		const workbook = yield* _(parseWorkbook(file));
		const result = yield* _(
			config.rules.reduce(
				(acc, rule) => acc.pipe(Effect.flatMap((state) => applyRule(state, rule))),
				Effect.succeed({ workbook, selectedSheet: null }),
			),
		).pipe(
			Effect.mapError(
				(e) =>
					new TransformError({
						rule: e.rule ?? 'unknown',
						reason: e.message ?? String(e),
					}),
			),
		);

		const csv = yield* _(toCsv(result.workbook, result.selectedSheet));
		return { csv };
	}).pipe(
		Effect.retry(Schedule.exponential('250 millis').pipe(Schedule.jittered, Schedule.recurs(3))),
		Effect.withSpan('transformFile'),
	);
```

2.2 Job Worker Integration

```typescript
// apps/api/src/workers/mutation-worker.ts
import Queue from 'bull';
import { Duration, Effect, Schedule } from 'effect';
import { DatabaseService, StorageService } from 'packages/core/src/Services';
import { transformFile } from 'packages/core/src/Transform';

import { effectBullProcessor } from '../effect/adapters/bull';
import { runWithRuntime } from '../effect/runtime';

const worker = new Queue('mutations', process.env.REDIS_URL!);

const processor = effectBullProcessor(
	(data) =>
		Effect.gen(function* (_) {
			const db = yield* _(DatabaseService);
			const storage = yield* _(StorageService);

			yield* _(db.updateJobStatus(data.jobId, 'processing'));

			const result = yield* _(
				transformFile(data.fileKey, data.configurationId).pipe(Effect.timeout(Duration.minutes(5))),
			);
			const uploaded = yield* _(storage.upload(`jobs/${data.jobId}.csv`, result.csv, 'text/csv'));

			yield* _(
				db.updateJobStatus(data.jobId, 'completed', {
					downloadUrl: uploaded.url,
				}),
			);
			return uploaded;
		}).pipe(
			Effect.retry(Schedule.exponential('1s').pipe(Schedule.recurs(3), Schedule.jittered)),
			Effect.withSpan('mutationJob'),
		),
	runWithRuntime,
);

worker.process(processor);
```

Phase 3 — Webhooks & Routes
Webhook Delivery

```typescript
// packages/core/src/webhook.ts
import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform';
import { Duration, Effect, Schedule } from 'effect';

import { WebhookError } from './errors';

export const deliverWebhook = (url: string, payload: unknown, secret: string) =>
	Effect.gen(function* (_) {
		const body = JSON.stringify(payload);
		const req = HttpClientRequest.post(url)
			.pipe(HttpClientRequest.setHeader('content-type', 'application/json'))
			.pipe(HttpClientRequest.bodyText(body));

		const res: HttpClientResponse = yield* _(HttpClient.request(req));
		if (res.status >= 200 && res.status < 300) return res.status;
		return yield* _(Effect.fail(new WebhookError({ url, status: res.status })));
	}).pipe(
		Effect.timeout(Duration.seconds(30)),
		Effect.retry(
			Schedule.exponential(Duration.seconds(1)).pipe(
				Schedule.intersect(Schedule.recurs(5)),
				Schedule.jittered,
			),
		),
	);
```

API Route Example

```typescript
// apps/api/src/routes/mutate.ts
app.post(
	'/v1/mutate/:mutationId',
	effectHandler(
		(req) => transformFile(req.body.fileKey, req.params.mutationId),
		runWithRuntime,
		(data) => ({ status: 200, body: { success: true, data } }),
		(err) => ({
			status: 400,
			body: { success: false, error: serializeErr(err) },
		}),
	),
);
```

Phase 4 — Advanced Features (Weeks 7–8)

- Circuit Breakers: use CircuitBreaker.make(...) around webhook delivery
- Rate Limiting: wrap job execution with RateLimiter.protect
- Health Checks: use Effect.all to check DB, Redis, and S3 concurrently
- Telemetry: use Effect.withSpan() and @effect/opentelemetry for tracing

Expected Benefits

✅ Strongly typed async + error handling
✅ Deterministic retries and cleanup
✅ Testable, composable service logic
✅ Structured tracing and observability
✅ 50–80% reduction in boilerplate async code
