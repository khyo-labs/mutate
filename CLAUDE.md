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
- ✅ Workspace-based multi-tenancy
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

### Authentication

- Better Auth handles authentication with organization plugin
- Session-based auth with secure cookies
- Support for email/password and social providers (GitHub, Google)

## API Structure

### Key Endpoints

- `GET /v1/auth/*` - Better Auth endpoints
- `GET /v1/mutations` - List user configurations
- `POST /v1/mutations` - Create new configuration
- `POST /v1/mutate` - Execute file transformation (async & sync support)
- `GET /v1/jobs/:jobId` - Check transformation job status
- `GET /v1/api-keys` - API key management
- `GET /v1/workspace/webhooks` - Webhook management
- `GET /v1/files/:key` - Download transformed files
- `GET /v1/health` - Health check

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

- ✅ Implemented async job processing with Bull/Redis queue system
- ✅ Added webhook system with signature verification and retry logic
- ✅ Integrated file storage support (AWS S3 & Cloudflare R2)
- ✅ Built comprehensive settings UI (API keys, webhooks, themes)
- ✅ Enhanced transformation engine with better error handling
- ✅ Added presigned URL generation for secure file downloads
- ✅ Implemented organization webhook management
- ✅ Added job status tracking and monitoring

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
