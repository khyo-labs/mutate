# Middleware Agent Guide

## Middleware Files

| File | Purpose |
|------|---------|
| `auth.ts` | Authentication (session + API key) and authorization (roles, admin) |
| `error-handler.ts` | Global error handler for all routes |
| `workspace-access.ts` | Validates user has access to requested workspace |
| `workspace-admin.ts` | Checks workspace admin role |
| `billing-middleware.ts` | Quota validation and usage tracking |

## Authentication Flow (`auth.ts`)

The `authenticate` function (line 92) routes to one of two strategies based on the `Authorization` header:

**Session auth** (`authenticateSession`, line 18):
1. Constructs a Web Request from Fastify request
2. Calls `auth.api.getSession()` (Better Auth)
3. Falls back to `auth.api.getSession({ headers })` if first attempt fails
4. Fetches user's organization membership from DB
5. Checks if user is a platform admin
6. Sets `request.currentUser` with `{ id, organizationId, role, isAdmin, adminPermissions }`

**API key auth** (`authenticateAPIKey`, line 104):
1. Extracts bearer token from `Authorization` header
2. Fetches ALL API keys from DB (no filtering)
3. Loops through each key, running `bcrypt.compare()` against the token
4. Validates key is not expired
5. Updates `lastUsedAt` timestamp
6. Sets `request.currentUser` with `role: 'api'`

## Role Hierarchy

`requireRole(requiredRole)` (line 186) enforces role-based access:

```
viewer: 1
member: 2
api:    2  (same level as member)
admin:  3
```

A user with level >= required level passes. Returns 403 `INSUFFICIENT_PERMISSIONS` otherwise.

## Admin Access (`requireAdmin`, line 220)

Checks `request.currentUser.isAdmin`. Logs access via `adminAuditService.logAdminAction()` with IP and user agent.

## Workspace Access (`workspace-access.ts`)

`validateWorkspaceAccess` middleware:
1. Extracts `workspaceId` from `request.params`
2. Queries DB for workspace existence
3. Verifies user membership in workspace
4. Attaches `request.workspace` with `{ id, name, slug, memberRole }`

Error codes: `WORKSPACE_ID_REQUIRED` (400), `UNAUTHORIZED` (401), `WORKSPACE_ACCESS_DENIED` (403), `WORKSPACE_NOT_FOUND` (404).

## Error Handler (`error-handler.ts`)

Global Fastify error handler registered via `fastify.setErrorHandler()`. Handles:

| Error Type | Status | Code |
|------------|--------|------|
| Zod validation error | 400 | `VALIDATION_ERROR` (with field details) |
| Fastify validation error | 400 | `VALIDATION_ERROR` |
| File too large (`FST_REQ_FILE_TOO_LARGE`) | 413 | `FILE_TOO_LARGE` |
| Rate limited (`FST_TOO_MANY_REQUESTS`) | 429 | `RATE_LIMIT_EXCEEDED` |
| DB unique violation (23505) | 409 | `DUPLICATE_RESOURCE` |
| DB foreign key violation (23503) | 400 | `INVALID_REFERENCE` |
| Everything else | 500 | `INTERNAL_SERVER_ERROR` |

## Billing Middleware (`billing-middleware.ts`)

- `validateQuotaMiddleware` — checks conversion quota before processing, stores result in `request.quotaValidation`
- `trackConversionStart` / `trackConversionComplete` / `trackConversionFailure` — billing event recording functions called from queue event handlers
