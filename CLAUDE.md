# Mutate - Data Transformation Platform

## Project Overview

Mutate is a SaaS platform that enables users to create visual, reusable configurations for transforming XLSX files to CSV format. Users can design transformation rules through a drag-and-drop interface, test them with preview functionality, and execute transformations via API or web interface.

## Architecture

### Monorepo Structure

```
mutate/
├── apps/
│   ├── api/            # Fastify + TypeScript API (routes, services, middleware, workers)
│   ├── web/            # React + Vite frontend
│   ├── marketing/      # Vite marketing site
│   └── webhook-test/   # Minimal Fastify webhook receiver for local testing
├── infrastructure/     # Docker, docker-compose.dev.yml, helper scripts
├── docs/               # Auth/billing notes and plans
└── packages/           # Shared packages (future)
```

### Technology Stack

**Backend (`@mutate/api`)**

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify 5.x
- **Authentication**: Better Auth (session-based with organization support)
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: ExcelJS for XLSX handling
- **Queue System**: Bull (Redis-based) for async processing
- **File Storage**: AWS S3 & Cloudflare R2 support with presigned URLs
- **Webhooks**: Retry mechanism with exponential backoff and signature verification
- **Validation**: Zod schemas

**Frontend (`@mutate/web`)**

- **Framework**: React 19 with Vite
- **Routing**: TanStack Router v1.73
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4.1
- **UI Components**: Custom components + Lucide React icons
- **File Handling**: XLSX library for previews
- **Drag & Drop**: @dnd-kit for rule builder
- **Charts**: Recharts for analytics

## Key Features

### Current Implementation Status

- ✅ User authentication with Better Auth (email/password, GitHub, Google)
- ✅ Passkey authentication support (WebAuthn/FIDO2)
- ✅ Two-factor authentication (2FA) with QR codes and backup codes
- ✅ Workspace-based multi-tenancy with active workspace tracking in database
- ✅ Configuration management (CRUD operations)
- ✅ Visual rule builder with drag & drop
- ✅ File upload and processing
- ✅ Spreadsheet preview functionality
- ✅ Database schema with migrations
- ✅ Rule processing engine (implemented)
- ✅ API key management (full CRUD)
- ✅ Async job processing with Bull/Redis
- ✅ Webhook system with retry logic
- ✅ File storage (AWS S3 & Cloudflare R2 support)
- ✅ Settings UI (theme, webhooks, API keys)
- ✅ User profile management (name, email, avatar)
- ✅ Workspace deletion with cascade data removal
- ✅ Admin panel with platform administration features
- ✅ Admin audit logging for platform operations
- ✅ Feature flags management system
- ✅ System health monitoring
- ✅ Organization member management
- 🚧 Rule processing improvements (ongoing)

### Supported Transformation Rules

1. **SELECT_WORKSHEET** - Select worksheet by name/index
2. **VALIDATE_COLUMNS** - Validate expected column count
3. **UNMERGE_AND_FILL** - Unmerge cells and fill values
4. **DELETE_ROWS** - Delete rows based on conditions
5. **DELETE_COLUMNS** - Remove specified columns
6. **COMBINE_WORKSHEETS** - Merge multiple worksheets
7. **EVALUATE_FORMULAS** - Calculate formula values

## Commands

### Development

```bash
bun install           # Install dependencies
bun dev               # Start both API and web in development (Turbo)
bun build             # Build all apps
bun typecheck         # Run TypeScript checks
bun lint              # Run linting
bun format            # Format code with Prettier
```

### App-specific

```bash
bun --filter @mutate/api dev       # Start API only
bun --filter @mutate/api build     # Build API only
bun --filter @mutate/web dev       # Start web only
bun --filter @mutate/marketing dev # Start marketing site only
```

### Database

```bash
bun db:generate       # Generate Drizzle migration SQL
bun db:migrate        # Apply migrations
bun db:studio         # Open Drizzle Studio UI
```

## Development Guidelines

### Coding Style & Naming

- Formatting via Prettier (`bun format`); linting with `bun lint`
- TypeScript strict mode throughout; prefer explicit types for public APIs
- Prefer function declarations over arrow functions: `function myFunction() {}` instead of `const myFunction = () => {}`
- Naming: PascalCase for types/interfaces, camelCase for vars/functions, UPPER_SNAKE for constants/env
- Files: kebab-case (`quota-enforcement-service.ts`); tests mirror files with `.test.ts`
- Do not add one line comments unless absolutely needed
- Do not chain ternary operators
- Always use the api-client when you can instead of native fetch

### UI Components and Icons

- Use custom components following existing patterns
- Use Lucide React for all icons (already installed as `lucide-react`)
- Follow Tailwind CSS v4 conventions for styling

### Database

- Use Drizzle ORM with PostgreSQL
- All migrations are version controlled in `apps/api/src/db/migrations/`
- Database connection and schema defined in `apps/api/src/db/`
- Key tables:
  - `user`, `session`, `account` - Authentication and user management
  - `organization`, `member`, `invitation` - Multi-tenancy
  - `configuration`, `transformation_job` - Core business logic
  - `api_key`, `organization_webhook` - Integration features
  - `platform_admin`, `platform_audit_logs` - Admin functionality
  - `feature_flags`, `system_metrics` - Platform management
  - `passkey`, `two_factor` - Enhanced security features

### Authentication

- Better Auth handles authentication with organization plugin
- Session-based auth with secure cookies
- Support for email/password and social providers (GitHub, Google)

### API Error Format

```json
error: {
	code: 'NOT_AUTHENTICATED',
	message: 'Authentication required',
}
```

## Testing Guidelines

- Framework: Vitest in `apps/api`. Run: `bun --filter @mutate/api test`
- Place tests next to implementation: `foo.ts` and `foo.test.ts`
- Avoid external calls in unit tests; stub queue/storage/email. Use fast, deterministic data.

## Commit & Pull Request Guidelines

- Commits: imperative, concise subjects. Optional scope prefix, e.g. `api: add quota checks`, `web: fix mutation list`
- PRs: include description, linked issues, testing steps. Add screenshots/GIFs for UI changes.
- API changes: note required env vars and include migrations/seed updates when relevant.

## API Structure

### Key Endpoints

- `GET /v1/auth/*` - Better Auth endpoints (including passkey and 2FA)
- `GET /v1/workspace/:id/configuration` - List user configurations
- `POST /v1/workspace/:id/configuration` - Create new configuration
- `POST /v1/mutate/:mutationId` - Execute file transformation (async & sync support)
- `GET /v1/mutate/:mutationId/jobs/:jobId` - Check transformation job status
- `POST /v1/mutate/:mutationId/jobs/:jobId/download` - Download transformed file
- `GET /v1/workspace/:id/api-keys` - API key management
- `GET /v1/workspace/:id/webhooks` - Webhook management
- `DELETE /v1/workspace/:id` - Delete workspace and all related data
- `GET /v1/files/:key` - Download transformed files
- `GET /v1/health` - Health check
- `GET /v1/admin/*` - Admin panel endpoints (users, workspaces, billing, audit)
- `GET /v1/admin/check-access` - Check admin access and 2FA requirements
- `GET /v1/admin/workspaces/:id/stats` - Get workspace statistics
- `GET /v1/admin/features` - Feature flags management
- `GET /v1/admin/health` - System health monitoring

### Response Format

```json
{
	"success": true,
	"data": {
		/* response payload */
	}
}
```

## Environment Setup

### Security & Configuration

- Never commit secrets. Copy `.env.example` to `.env` per app.
- Local services: use `infrastructure/docker/docker-compose.dev.yml` and scripts in `infrastructure/scripts/` (`start-dev.sh`, `stop-dev.sh`).
- Some features require S3/Email/Redis credentials; see `apps/api/.env.example` and `README.md`.

### Required Environment Variables

**API (.env in apps/api/)**

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-32-char-secret
REDIS_URL=redis://localhost:6379

# Storage Configuration
STORAGE_TYPE=local|s3
AWS_ACCESS_KEY_ID=optional
AWS_SECRET_ACCESS_KEY=optional
AWS_S3_BUCKET=optional
AWS_REGION=optional

# Cloudflare R2 Support
CLOUDFLARE_R2_ACCESS_KEY_ID=optional
CLOUDFLARE_R2_SECRET_ACCESS_KEY=optional
CLOUDFLARE_R2_BUCKET=optional
CLOUDFLARE_R2_ENDPOINT=optional

# Webhook Configuration
WEBHOOK_SECRET=optional
WEBHOOK_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=5

# OAuth Providers
GITHUB_CLIENT_ID=optional
GITHUB_CLIENT_SECRET=optional
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
```

**Web (.env in apps/web/)**

```
VITE_API_URL=http://localhost:3000
```

## Recent Changes

- ✅ Redesigned mutation detail page with Card-based layout, Skeleton loading, and Alert error states
- ✅ Redesigned mutation edit page: removed debug logs, replaced alerts with toasts, proper loading/error states
- ✅ Redesigned MutationSidebar: single Card with Tabs for code examples, showConfig prop, useClipboard hook
- ✅ Extracted shared utilities: `format.ts`, `status-badge.tsx`, `use-clipboard.ts`
- ✅ Extracted RunHistory into standalone component with Card layout and Skeleton loading
- ✅ Redesigned dashboard with shadcn Card primitives and usage quota Progress bars
- ✅ Fixed usage quota data shape mismatch between API and frontend
- ✅ Added passkey authentication (WebAuthn/FIDO2) for passwordless login
- ✅ Implemented two-factor authentication (2FA) with QR codes and backup codes
- ✅ Added user profile management with avatar, name, and email updates
- ✅ Moved active workspace tracking from local storage to database
- ✅ Implemented complete workspace deletion with cascade data removal
- ✅ Built comprehensive admin panel with platform administration features
- ✅ Added admin audit logging for tracking all administrative actions
- ✅ Implemented feature flags management for controlled feature rollouts
- ✅ Added system health monitoring and metrics tracking
- ✅ Enhanced workspace navigation with improved UI/UX
- ✅ Added redirect logic for authenticated users on auth pages
- ✅ Improved mutations pages with shadcn/tailwind theme integration
- ✅ Enhanced API key management with new UI design
- ✅ Added workspace member management and invitations
- ✅ Implemented organization limits and quota enforcement
