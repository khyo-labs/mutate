# API Agent Guide

## Architecture

Fastify 5 API with TypeScript, using Better Auth for authentication, Drizzle ORM for PostgreSQL, Bull/Redis for async job processing, and Effect.ts for newer functional pipelines.

Entry point: `src/index.ts`. Plugin registration order: helmet -> CORS -> multipart -> rate-limit -> auth plugin -> email verification plugin -> error handler -> v1 routes. Workers are imported as side effects at the bottom of the entry point.

## Directory Structure

```
src/
  index.ts              # Server entry point, plugin registration
  config.ts             # Zod-validated environment config
  routes/v1/            # All API routes (see routes/AGENTS.md)
  services/             # Business logic layer (see services/AGENTS.md)
  middleware/            # Auth, error handling, workspace access (see middleware/AGENTS.md)
  plugins/              # Fastify plugins (auth decorator, email verification)
  db/                   # Drizzle schema, connection, migrations (see db/AGENTS.md)
  workers/              # Bull queue processors (see workers/AGENTS.md)
  effect/               # Effect.ts layers, services, adapters (see effect/AGENTS.md)
  converters/           # File format conversion implementations
  schemas/              # Zod validation schemas (configuration.ts, workspace.ts, user.ts)
  types/                # TypeScript types and Fastify augmentations
  utils/                # Error, logger, ID generation, MIME type helpers
  lib/                  # Better Auth initialization
  scripts/              # Admin management scripts (make-admin, remove-admin, list-admins)
  test/                 # Test setup
```

## Key Conventions

**Response format** (all endpoints):

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

**Error codes**: Use UPPER_SNAKE_CASE strings (e.g. `NOT_AUTHENTICATED`, `WORKSPACE_NOT_FOUND`, `VALIDATION_ERROR`).

**File naming**: kebab-case (`quota-enforcement-service.ts`). Tests beside implementation as `.test.ts`.

**Functions**: Prefer `function` declarations over arrow functions.

**Types**: Prefer `type` over `interface`.

**Imports**: Use `@/` path alias for all internal imports (mapped to `src/`).

**Logging**: Use Fastify's Pino logger (`fastify.log` / `request.log`). Avoid `console.log`/`console.error`.

## Adding New Routes

1. Create route file in `src/routes/v1/` (or `src/routes/v1/workspaces/` for workspace-scoped routes)
2. Export an `async function fooRoutes(fastify: FastifyInstance)` function
3. Register in `src/routes/v1/index.ts` with `await fastify.register(fooRoutes, { prefix: '/v1/foo' })`
4. Add auth middleware as `preHandler` hooks on individual routes
5. Validate request body with Zod schemas from `src/schemas/`

## Adding New Services

1. Create service file in `src/services/`
2. For new Effect-based services: create in `src/effect/services/`, add layer to `src/effect/runtime.ts`
3. For traditional services: export class or functions, use `db` from `@/db/connection.js`

## Known Issues

### Security

1. **O(n) API key lookup** (`src/middleware/auth.ts:122-140`) - Fetches ALL API keys from DB and loops through each doing bcrypt compare. With 100 keys, auth takes ~10s. Should use a key prefix for indexed lookup.

2. **Local storage URLs are not signed** (`src/services/storage.ts:130-131`) - LocalStorageProvider generates URLs with `?expires=` timestamp but the file route (`src/routes/v1/files.ts:18-28`) only checks the timestamp, not a cryptographic signature. Anyone who knows the URL pattern can access files.

3. **Rate limit key exposes raw API key** (`src/index.ts:66-72`) - The rate limiter's `keyGenerator` uses the raw bearer token as the Redis key. Should hash the token before using as a key.

4. **File download route has no authentication** (`src/routes/v1/files.ts:10`) - `GET /v1/files/*` has no auth middleware. Relies solely on URL secrecy + timestamp expiry.

5. **Invalid `expires` param bypasses expiry** (`src/routes/v1/files.ts:19`) - `parseInt` on non-numeric input returns `NaN`, and `Date.now() > NaN` is `false`, so invalid expires values mean the file never expires.

### Reliability

6. **Webhook queue not closed on shutdown** (`src/index.ts:98`) - Graceful shutdown closes `transformationQueue` but not `webhookDeliveryQueue` or `webhookDeadLetterQueue`.

7. **S3 delete silently fails** (`src/services/storage.ts:81-94`) - `deleteFile` catches all errors and returns `false`. Callers may not check the return value.

8. **No file cleanup mechanism** - `FILE_TTL` config only controls presigned URL expiry. No cron job or cleanup process removes expired files from local storage or S3.

### Code Quality

9. **Inconsistent logging** - `storage.ts` uses `console.error`, `files.ts` uses `console.log`, queue event handlers use `console.log`/`console.error`/`console.warn`. Routes use `fastify.log`. Should standardize on Pino.

10. **S3 credentials not validated at config parse time** (`src/config.ts`) - When `STORAGE_TYPE=s3`, missing credentials only error at `StorageService` construction, not at startup.

11. **`adminPermissions` typed as `unknown`** (`src/types/fastify.ts`) - No type safety for admin permission checks.

12. **`console.log` in file route** (`src/routes/v1/files.ts:14`) - Logs every file request including path to stdout.
