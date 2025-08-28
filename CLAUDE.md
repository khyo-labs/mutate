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
- **Authentication**: Better Auth (recently migrated from JWT)
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: ExcelJS for XLSX handling
- **Queue System**: Bull (Redis-based) for async processing
- **Validation**: Zod schemas

**Frontend (`@mutate/web`)**

- **Framework**: React 18 with Vite
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
- ✅ Organization-based multi-tenancy
- ✅ Configuration management (CRUD operations)
- ✅ Visual rule builder with drag & drop
- ✅ File upload and processing
- ✅ Spreadsheet preview functionality
- ✅ Database schema with migrations
- 🚧 Rule processing engine (in development)
- 🚧 API key management
- 🚧 Async job processing

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
- `POST /v1/transform` - Execute file transformation
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

- Migrated from JWT to Better Auth for improved authentication
- Updated to Tailwind CSS v4
- Added organization-based multi-tenancy
- Implemented visual configuration builder
- Added spreadsheet preview functionality

## Development Notes

- The app uses a monorepo structure with pnpm workspaces
- Turbo is used for build orchestration
- All apps use TypeScript with strict mode
- Database migrations are handled by Drizzle
- The frontend uses TanStack Router for type-safe routing
