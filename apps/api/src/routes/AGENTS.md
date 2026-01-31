# Routes Agent Guide

## Route Registration

All routes are registered in `v1/index.ts` with version prefix `/v1/`. Each route file exports an `async function fooRoutes(fastify: FastifyInstance)` that registers handlers.

**Prefix mapping** (`v1/index.ts`):
```
/v1/health       -> health.ts          (no auth)
/v1/auth         -> better-auth.ts     (Better Auth proxy, no auth)
/v1/auth/custom  -> auth.ts            (custom auth endpoints)
/v1/security     -> security.ts        (2FA endpoints, auth required)
/v1/workspace    -> workspaces/        (workspace CRUD + sub-routes)
/v1/mutate       -> mutate.ts          (file transformation, auth required)
/v1/files        -> files.ts           (file download, no auth - uses URL expiry)
/v1/billing      -> billing.ts         (subscription plans)
/v1/admin        -> admin/             (platform admin, admin auth required)
/v1/user         -> user.ts            (user profile, auth required)
/v1/convert      -> convert.ts         (generic conversion, auth required)
/v1/formats      -> formats.ts         (supported format list, no auth)
```

## Auth Middleware Ordering

Apply as `preHandler` hooks in this order:
```
1. fastify.authenticate          # Session or API key auth
2. fastify.requireVerifiedEmail  # Skipped for API key users
3. validateWorkspaceAccess       # For workspace-scoped routes
4. requireRole('admin')          # Role check if needed
```

Example:
```typescript
fastify.get('/', {
  preHandler: [fastify.authenticate, validateWorkspaceAccess],
}, async (request, reply) => { ... })
```

## Workspace-Scoped Routes

Routes under `workspaces/` use `:workspaceId` param. Sub-routes registered in `workspaces/index.ts`:
```
/:workspaceId/configuration  -> configuration.ts
/:workspaceId/api-keys       -> api-keys.ts
/:workspaceId/webhooks       -> webhooks.ts
/:workspaceId/members        -> members.ts
```

The `validateWorkspaceAccess` middleware verifies the user is a member and attaches `request.workspace` with `{ id, name, slug, memberRole }`.

## Admin Routes

Routes under `admin/` require both `fastify.authenticate` and `requireAdmin` middleware. Sub-routes:
```
/v1/admin/check-access  -> inline (admin/index.ts)
/v1/admin/overview      -> inline (admin/index.ts)
/v1/admin/stats         -> inline (admin/index.ts)
/v1/admin/billing       -> admin/billing.ts
/v1/admin/workspaces    -> admin/workspaces.ts
/v1/admin/health        -> admin/health.ts
/v1/admin/webhooks      -> admin/webhooks.ts
```

## Two Route Patterns

**Traditional** (most routes): Direct Fastify handlers with `request`/`reply`.

**Effect-based** (mutate.ts, convert.ts, configuration.ts, webhooks-effect.ts): Uses `effectHandler()` adapter from `@/effect/adapters/fastify.ts`. The adapter runs an Effect pipeline with the app runtime providing DatabaseService, StorageService, LoggerService, and WebhookService. Success automatically wraps in `{ success: true, data: result }`. Errors are unwrapped from Effect's FiberFailure and serialized.

```typescript
fastify.post('/', {
  preHandler: [fastify.authenticate],
}, effectHandler((req) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    // ... pipeline
    return result;
  })
));
```

## Validation

- **Request body**: Zod schemas from `src/schemas/`. Parse manually with `schema.parse(request.body)`.
- **Route params/query**: JSON Schema in Fastify route options or parsed inline.
- Zod errors are caught by the global error handler and returned as 400 with field-level details.
