# Data Transformation Platform - Requirements Document

## Project Overview

Build a multi-tenant SaaS platform that enables users to create visual, reusable configurations for transforming XLSX files to CSV format. Users can design transformation rules through a drag-and-drop interface, test them with preview functionality, and execute transformations via API or web interface.

## Technology Stack

### Backend

- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify
- **XLSX Processing**: ExcelJS (primary) or SheetJS (fallback)
- **Queue**: Bull (Redis-based)
- **ORM**: Drizzle with PostgreSQL
- **Validation**: Zod

### Frontend

- **Framework**: React with Vite and TanStack Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Spreadsheet Component**: Handsontable
- **Drag & Drop**: @dnd-kit (preferred) or react-beautiful-dnd
- **Charts**: Recharts
- **Testing**: Vitest + React Testing Library

## Core Features - Phase 1 (MVP)

### 1. User Authentication & Organization Management

#### Requirements

- **User Registration/Login**
  - Email/password authentication
  - JWT-based session management
  - Password reset functionality

- **Organization Context**
  - Users belong to organizations
  - Organization-level data isolation
  - Basic role support (admin, member)

#### API Endpoints

```
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/auth/me
```

#### Database Schema

```
organizations
  - id (UUID, primary key)
  - name (string, required)
  - created_at (timestamp)
  - updated_at (timestamp)

users
  - id (UUID, primary key)
  - email (string, unique, required)
  - password_hash (string, required)
  - organization_id (UUID, foreign key)
  - role (enum: admin, member)
  - created_at (timestamp)
```

### 2. Configuration Management

#### Requirements

- **CRUD Operations**
  - Create new transformation configurations
  - List configurations for organization
  - Update existing configurations
  - Delete configurations (soft delete)
  - Clone existing configurations

- **Configuration Structure**
  - Name and description
  - Array of transformation rules
  - Output format settings
  - Version tracking (increment on update)

#### API Endpoints

```
POST   /v1/configurations
GET    /v1/configurations (paginated)
GET    /v1/configurations/{id}
PUT    /v1/configurations/{id}
DELETE /v1/configurations/{id}
POST   /v1/configurations/{id}/clone
```

#### Database Schema

```
configurations
  - id (UUID, primary key)
  - organization_id (UUID, foreign key)
  - name (string, required)
  - description (text)
  - rules (JSONB, required)
  - output_format (JSONB, required)
  - version (integer, default 1)
  - is_active (boolean, default true)
  - created_by (UUID, foreign key)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### 3. Transformation Rules Engine

#### Supported Rule Types

1. **SELECT_WORKSHEET**
   - Select worksheet by name, pattern match, or index
   - Parameters: `value`, `type`

2. **VALIDATE_COLUMNS**
   - Validate expected number of columns
   - Parameters: `numOfColumns`, `onFailure` (stop/notify/continue)

3. **UNMERGE_AND_FILL**
   - Unmerge cells and fill values down/up
   - Parameters: `columns[]`, `fillDirection`

4. **DELETE_ROWS**
   - Delete rows based on conditions
   - Parameters: `condition` (contains text, empty, pattern match)

5. **DELETE_COLUMNS**
   - Remove specified columns
   - Parameters: `columns[]` (by letter or index)

6. **COMBINE_WORKSHEETS**
   - Append or merge multiple worksheets
   - Parameters: `sourceSheets[]`, `operation` (append/merge)

7. **EVALUATE_FORMULAS**
   - Calculate and replace formulas with values
   - Parameters: `enabled` (boolean)

#### Rule Processing Requirements

- Sequential execution of rules
- Error handling per rule (stop/skip/notify)
- Execution logging for debugging
- Rollback capability on failure

### 4. File Processing API

#### Requirements

- **Synchronous Processing** (< 10MB files)
  - Immediate response with transformed file
  - Max processing time: 30 seconds

- **Asynchronous Processing** (>= 10MB files)
  - Queue-based processing
  - Status polling endpoint
  - Optional webhook callbacks

- **File Management**
  - Temporary storage with configurable TTL
  - Secure file URLs with expiration
  - Automatic cleanup of expired files

#### API Endpoints

```
POST   /v1/transform
  Body: multipart/form-data
    - configId (string)
    - file (binary)
    - options (JSON):
      - async (boolean)
      - retention (string, e.g., "1h", "24h")
      - callback (webhook URL, optional)

GET    /v1/jobs/{jobId}
GET    /v1/files/{fileId}/download
DELETE /v1/files/{fileId}
```

#### Database Schema

```
transformation_jobs
  - id (UUID, primary key)
  - organization_id (UUID, foreign key)
  - configuration_id (UUID, foreign key)
  - status (enum: pending, processing, completed, failed)
  - input_file_url (string)
  - output_file_url (string)
  - error_message (text)
  - execution_log (JSONB)
  - created_by (UUID, foreign key)
  - started_at (timestamp)
  - completed_at (timestamp)
  - created_at (timestamp)
```

### 5. Visual Configuration Builder (Frontend)

#### Core Components

1. **Configuration List Page**
   - Table view of all configurations
   - Search and filter capabilities
   - Quick actions (edit, clone, delete)
   - Create new configuration button

2. **Configuration Builder Page**
   - Three-panel layout:
     - Left: Available rules catalog
     - Center: Active rules list (drag & drop)
     - Right: Rule parameter editor

3. **Rule Components**
   - Draggable rule cards
   - Visual indicators for rule type
   - Inline parameter editing
   - Delete and duplicate actions
   - Reorder via drag & drop

4. **File Preview Component**
   - Display XLSX data in grid format
   - Worksheet tab navigation
   - Cell selection capabilities
   - Highlight affected rows/columns

5. **Test Mode**
   - Upload sample file
   - Execute transformation preview
   - Show before/after comparison
   - Display execution log
   - Performance metrics

#### User Flows

1. **Create Configuration Flow**

   ```
   Dashboard → Click "New Configuration" →
   Enter name/description → Add rules via drag & drop →
   Configure rule parameters → Save configuration
   ```

2. **Test Configuration Flow**

   ```
   Configuration Builder → Click "Test" →
   Upload sample file → View preview →
   Review execution log → Adjust rules if needed
   ```

3. **Execute Transformation Flow**
   ```
   Dashboard → Select configuration →
   Upload file → Choose options (retention, async) →
   Submit → Download result or get job ID
   ```

### 6. API Key Management

#### Requirements

- Generate API keys per organization
- Set key permissions/scopes
- Track key usage and last used timestamp
- Revoke keys

#### API Endpoints

```
POST   /v1/api-keys
GET    /v1/api-keys
DELETE /v1/api-keys/{id}
```

#### Database Schema

```
api_keys
  - id (UUID, primary key)
  - organization_id (UUID, foreign key)
  - key_hash (string, required)
  - name (string)
  - permissions (JSONB)
  - last_used_at (timestamp)
  - created_by (UUID, foreign key)
  - created_at (timestamp)
  - expires_at (timestamp, optional)
```

## Non-Functional Requirements

### Performance

- **Response Times**
  - API endpoints: < 200ms (p95)
  - File processing: < 2s for files under 5MB
  - UI interactions: < 100ms feedback

- **Throughput**
  - Support 100 concurrent transformations
  - Handle 1000 API requests/minute

- **File Size Limits**
  - Max file size: 50MB (initial)
  - Max rows: 1 million
  - Max columns: 1000

### Security

- **Authentication**
  - JWT tokens with 1-hour expiry
  - Refresh tokens with 30-day expiry
  - API keys with rate limiting

- **Data Protection**
  - HTTPS only (TLS 1.3)
  - File encryption at rest
  - Secure file URLs with expiration
  - Input validation on all endpoints

- **Multi-tenancy**
  - Complete data isolation between organizations
  - Row-level security in database
  - Separate storage paths per organization

### Reliability

- **Error Handling**
  - Graceful degradation
  - Detailed error messages for debugging
  - Retry logic for transient failures

- **Monitoring**
  - Application logs (structured JSON)
  - Error tracking
  - Performance metrics
  - Health check endpoints

### Scalability

- **Horizontal Scaling**
  - Stateless API servers
  - Multiple worker processes
  - Redis cluster for queues

- **Resource Limits**
  - Rate limiting per API key
  - Concurrent job limits per organization
  - Storage quotas

## Implementation Priorities

### Week 1-2: Foundation

1. Project setup (Fastify, Drizzle, React/Vite)
2. Database schema and migrations
3. Basic authentication (register, login, JWT)
4. Organization context setup

### Week 3-4: Configuration Management

1. Configuration CRUD endpoints
2. Rule validation with Zod schemas
3. Basic frontend routing with TanStack Router
4. Configuration list and create pages

### Week 5-6: Rule Processing Engine

1. Core rule processor implementation
2. Individual rule handlers (SELECT_WORKSHEET, DELETE_ROWS, etc.)
3. ExcelJS integration
4. Error handling and logging

### Week 7-8: File Processing

1. File upload endpoints
2. Synchronous processing flow
3. Bull queue setup for async processing
4. File storage (local/S3)
5. Download URL generation

### Week 9-10: Visual Builder

1. Drag & drop rule builder with @dnd-kit
2. Rule parameter forms
3. Handsontable integration for preview
4. Test mode implementation

### Week 11-12: Polish & Testing

1. API key management
2. Error handling improvements
3. Performance optimization
4. Unit tests for critical paths
5. Integration tests for main flows

## API Response Formats

### Success Response

```json
{
	"success": true,
	"data": {
		// Response payload
	}
}
```

### Error Response

```json
{
	"success": false,
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid configuration parameters",
		"details": {
			// Additional error context
		}
	}
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Development Guidelines

### Backend Structure

```
src/
  ├── routes/          # Fastify route definitions
  ├── services/        # Business logic
  ├── processors/      # Rule processing logic
  ├── workers/         # Bull queue workers
  ├── db/             # Drizzle schema and migrations
  ├── schemas/        # Zod validation schemas
  ├── middleware/     # Auth, rate limiting, etc.
  ├── utils/          # Helper functions
  └── types/          # TypeScript type definitions
```

### Frontend Structure

```
src/
  ├── routes/         # TanStack Router pages
  ├── components/     # Reusable React components
  ├── features/       # Feature-specific components
  ├── stores/         # Zustand stores
  ├── hooks/          # Custom React hooks
  ├── api/            # API client functions
  ├── utils/          # Helper functions
  └── types/          # TypeScript types
```

### Code Standards

- Use TypeScript strict mode
- Implement proper error boundaries
- Add JSDoc comments for public APIs
- Follow RESTful naming conventions
- Use semantic HTML and ARIA labels
- Implement loading and error states
- Add data-testid attributes for testing

## Testing Requirements

### Unit Tests

- Rule processors (each rule type)
- Validation schemas
- Utility functions
- React component logic

### Integration Tests

- Authentication flow
- Configuration CRUD
- File transformation pipeline
- API key validation

### E2E Tests (Future)

- Complete user journey from registration to transformation
- Configuration builder workflow
- File upload and download

## Deliverables

### Phase 1 (MVP)

1. Working API with core endpoints
2. Web UI for configuration management
3. Basic rule processing engine
4. File upload and transformation
5. API documentation
6. Basic deployment setup

### Documentation

1. API documentation (OpenAPI/Swagger)
2. User guide for configuration builder
3. Rule type reference
4. Deployment instructions
5. Environment setup guide

## Success Metrics

- Successfully transform XLSX to CSV with configured rules
- Support at least 5 concurrent transformations
- < 5 second processing time for 10MB files
- 99% uptime for API availability
- < 1% error rate for transformations

## Future Enhancements (Post-MVP)

- Additional file formats (CSV→XLSX, PDF→Excel)
- Advanced rule types (formulas, conditionals)
- Configuration templates marketplace
- Team collaboration features
- Scheduling and automation
- Webhook integrations
- Advanced analytics and reporting
- White-label options
