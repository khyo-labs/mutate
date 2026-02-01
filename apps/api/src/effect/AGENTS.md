# Effect.ts Agent Guide

## Overview

The API is incrementally adopting Effect.ts for functional error handling and dependency injection. Newer routes (mutate, convert, configuration, webhooks-effect) use Effect pipelines. Older routes use traditional async/await.

## Directory Structure

```
effect/
  runtime.ts                          # ManagedRuntime with all service layers
  adapters/
    fastify.ts                        # effectHandler() adapter for Fastify routes
    bull.ts                           # Queue integration adapter
  layers/
    drizzle.layer.ts                  # DatabaseService layer (Drizzle DB access)
    logger.layer.ts                   # LoggerService layer
    storage.layer.ts                  # StorageService layer (file operations)
  services/
    storage-stream.service.ts         # Streaming storage operations
    webhook.service.ts                # Webhook delivery via Effect
```

## Runtime (`runtime.ts`)

The app runtime combines all service layers:

```typescript
const AppLive = Layer.mergeAll(
	DrizzleDatabaseLayer,
	StorageServiceLayer,
	StorageStreamServiceLive,
	LoggerServiceLayer,
	WebhookServiceLive,
);

export const runtime = ManagedRuntime.make(AppLive);
```

When adding a new Effect service:

1. Create service definition with `Context.Tag`
2. Create live implementation as a `Layer`
3. Add the layer to `AppLive` in `runtime.ts`

## Fastify Adapter (`adapters/fastify.ts`)

`effectHandler()` wraps an Effect pipeline as a Fastify route handler:

```typescript
effectHandler<A, E, T>(
  effectFn: (req: FastifyRequest<T>) => Effect.Effect<A, E, any>,
  options?: { onSuccess?, onError? }
)
```

**Default behavior**:

- Success: returns `{ success: true, data: result }`
- Error: unwraps Effect's FiberFailure, serializes to `{ success: false, error: { code, message } }`

**Error unwrapping** (`unwrapEffectError`): Traverses Effect's error cause chain (`FiberFailure -> Cause -> value`). Also handles nested causes (`left`, `right`, `first`, `second`, `causes` array). Falls back to JSON parsing error messages.

**Custom handlers**: Pass `onSuccess`/`onError` in options to override default response behavior when a route needs a non-standard response (e.g., streaming, custom status codes).

## Writing Effect Route Handlers

```typescript
import { Effect } from 'effect';

import { effectHandler } from '@/effect/adapters/fastify.js';
import { DatabaseService } from '@/effect/layers/drizzle.layer.js';

fastify.post(
	'/foo',
	{
		preHandler: [fastify.authenticate],
	},
	effectHandler((req) =>
		Effect.gen(function* () {
			const db = yield* DatabaseService;
			const result = yield* Effect.tryPromise(() =>
				db.select().from(table).where(eq(table.id, req.params.id)),
			);
			return result;
		}),
	),
);
```

## Error Patterns in Effect Pipelines

Use tagged errors for domain-specific failures:

```typescript
class NotFoundError {
	readonly _tag = 'NotFoundError';
	constructor(readonly message: string) {}
}

// In pipeline:
yield * Effect.fail(new NotFoundError('Configuration not found'));
```

The `serializeError()` function in `adapters/fastify.ts` uses `_tag` as the error code in API responses.

## When to Use Effect vs Traditional

- **Use Effect for**: New route handlers, complex pipelines with multiple service dependencies, operations needing structured error handling
- **Use traditional for**: Simple CRUD operations, auth middleware, utility functions, admin scripts
- **Do not mix**: Within a single route handler, use one pattern consistently
