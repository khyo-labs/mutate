# Mutate - Data Transformation Platform

## Project Overview

Mutate is a multi-tenant SaaS platform that enables users to create visual, reusable configurations for transforming XLSX files to CSV format. Users can design transformation rules through a drag-and-drop interface, test them with preview functionality, and execute transformations via API or web interface.

## Architecture

### Monorepo Structure

```
mutate/
├── apps/
│   ├── api/          # Backend API (Fastify)
│   └── web/          # Frontend App (React + Vite)
├── infrastructure/   # Docker & deployment configs
├── docs/            # Documentation
└── packages/        # Shared packages (future)
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

## Development Guidelines

### File Naming

- Use kebab-case for file names (e.g., `user-service.ts`, `auth-middleware.ts`)

### Code Style

- Prefer function declarations over arrow functions: `function myFunction() {}` instead of `const myFunction = () => {}`
- Use TypeScript strict mode across all projects
- Follow existing patterns in the codebase

### UI Components and Icons

- Use custom components following existing patterns
- Use Lucide React for all icons (already installed as `lucide-react`)
- Follow Tailwind CSS v4 conventions for styling

### Database

- Use Drizzle ORM with PostgreSQL
- All migrations are version controlled in `apps/api/src/db/migrations/`
- Database connection and schema defined in `apps/api/src/db/`
- Key tables include:
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

## Commands

### Development

```bash
pnpm dev          # Start both API and web in development
pnpm build        # Build all apps
pnpm typecheck    # Run TypeScript checks
pnpm lint         # Run linting
pnpm format       # Format code with Prettier
```

### Database

```bash
pnpm db:migrate   # Run database migrations
pnpm db:generate  # Generate new migration
pnpm db:studio    # Open Drizzle Studio
```

### App-specific

```bash
pnpm api dev      # Start API only
pnpm web dev      # Start web only
```

## Environment Setup

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

## Development Notes

- The app uses a monorepo structure with pnpm workspaces
- Turbo is used for build orchestration
- All apps use TypeScript with strict mode
- Database migrations are handled by Drizzle
- The frontend uses TanStack Router for type-safe routing
- Do not add one line comments unless absolutely needed
- Always use the api-client when you can instead of native fetch.
- When returning errors from the api use this format:
  ```json
  error: {
  	code: 'NOT_AUTHENTICATED',
  	message: 'Authentication required',
  }
  ```
- do not chain ternary operators
