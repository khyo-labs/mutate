# mutate API

Backend API for the mutate - a multi-tenant SaaS for configurable XLSX to CSV transformations.

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 14+
- Redis 6+
- pnpm

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` with your database and Redis URLs, plus a secure JWT secret.

4. Generate and run database migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

## Development

Start the development server:

```bash
pnpm dev
```

The API will be available at `http://localhost:3000`

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## API Documentation

### Health Endpoints

- `GET /v1/health` - Basic health check
- `GET /v1/health/db` - Database health check

### Authentication Endpoints

- `POST /v1/auth/register` - Register new user and organization
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh access token
- `GET /v1/auth/me` - Get current user info
- `POST /v1/auth/logout` - Logout user

### Configuration Endpoints (JWT Auth Required)

- `POST /v1/configurations` - Create configuration
- `GET /v1/configurations` - List configurations
- `GET /v1/configurations/:id` - Get configuration
- `PUT /v1/configurations/:id` - Update configuration
- `DELETE /v1/configurations/:id` - Delete configuration
- `POST /v1/configurations/:id/clone` - Clone configuration

### Transformation Endpoints (API Key Auth Required)

- `POST /v1/transform` - Transform file
- `GET /v1/transform/jobs/:jobId` - Get job status

## Environment Variables

See `.env.example` for all available configuration options.

## Database Schema

The API uses PostgreSQL with Drizzle ORM. Key tables:

- `organizations` - Multi-tenant organizations
- `users` - User accounts
- `configurations` - Transformation configurations
- `configuration_versions` - Configuration version history
- `transformation_jobs` - File processing jobs
- `api_keys` - API keys for programmatic access
- `audit_logs` - Audit trail

## Architecture

- **Framework**: Fastify
- **ORM**: Drizzle with PostgreSQL
- **Authentication**: JWT for web UI, API keys for programmatic access
- **Validation**: Zod schemas
- **File Processing**: ExcelJS (planned)
- **Queue**: Bull with Redis (planned)
- **Logging**: Pino
