# Database Agent Guide

## Stack

- **ORM**: Drizzle ORM with `drizzle-orm/postgres-js` adapter
- **Driver**: `postgres` (postgres.js)
- **Database**: PostgreSQL

## Files

| File            | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `connection.ts` | Creates DB client and Drizzle instance (`db` export) |
| `schema.ts`     | All table definitions (~670 lines)                   |
| `migrate.ts`    | Migration runner (dev)                               |
| `seed.ts`       | Database seeding                                     |
| `migrations/`   | SQL migration files (managed by Drizzle Kit)         |

## Connection

`connection.ts` exports `db` (Drizzle instance) and `closeConnection`. Pool config:

- Max connections: `config.DATABASE_MAX_CONNECTIONS` (default 10)
- Idle timeout: 20s
- Connect timeout: 10s

Always import `db` from `@/db/connection.js`.

## Schema Organization

All tables are defined in a single `schema.ts` file. Tables are grouped logically:

**Auth & Users**: `user`, `session`, `account`, `verification`, `passkey`, `twoFactor`

**Organizations**: `organization`, `member`, `invitation`

**Core Business**: `configurations`, `configurationVersions`, `transformationJobs`

**Integrations**: `organizationWebhooks`, `webhookDeliveries`, `apiKeys`

**Billing**: `subscriptionPlans`, `organizationSubscriptions`, `usageRecords`, `activeConversions`, `billingEvents`

**Admin**: `platformAdmins`, `platformAuditLogs`, `auditLogs`

**Platform**: `featureFlags`, `systemMetrics`

## Conventions

- Table names: camelCase in TypeScript, maps to snake_case in PostgreSQL via Drizzle
- Column names: camelCase in TypeScript
- Primary keys: `text('id')` using ULID or nanoid
- Timestamps: `timestamp('created_at').defaultNow()`, `timestamp('updated_at').defaultNow()`
- Foreign keys: defined with `references(() => table.column)` with appropriate `onDelete` actions
- Enums: defined inline with `text('column')` and validated at application level, not DB level

## Migration Workflow

```bash
pnpm db:generate   # Generate SQL migration from schema changes (Drizzle Kit)
pnpm db:migrate    # Apply migrations (dev, uses tsx)
pnpm db:migrate:prod  # Apply migrations (production, uses node scripts/migrate.js)
pnpm db:studio     # Open Drizzle Studio for visual DB browsing
```

When modifying `schema.ts`:

1. Make changes to table definitions
2. Run `pnpm db:generate` to create migration SQL
3. Review the generated SQL in `migrations/`
4. Run `pnpm db:migrate` to apply

## Query Patterns

```typescript
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/connection.js';
import { member, users } from '@/db/schema.js';

// Select
const result = await db.select().from(users).where(eq(users.id, id));

// Insert
await db.insert(users).values({ id, name, email });

// Update
await db.update(users).set({ name: 'new' }).where(eq(users.id, id));

// Delete
await db.delete(users).where(eq(users.id, id));

// Join
await db
	.select()
	.from(member)
	.leftJoin(organization, eq(member.organizationId, organization.id))
	.where(eq(member.userId, userId));
```
