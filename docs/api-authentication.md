# API Authentication Guide

## Overview

The Mutate API uses different authentication levels for different endpoints. This document outlines the authentication requirements for each endpoint category.

## Authentication Levels

### 1. Public Endpoints (No Authentication Required)

These endpoints can be accessed without any authentication:

- `GET /v1/health` - Health check
- `GET /v1/billing/plans/public` - Get all public subscription plans
- `GET /v1/billing/plans/public/:planId` - Get a specific public plan by ID

These endpoints are ideal for:

- Marketing websites to display pricing
- Public pricing pages
- Health monitoring services

### 2. Authenticated Endpoints (User Authentication Required)

These endpoints require a valid user session or API key:

#### Billing Endpoints

- `GET /v1/billing/plans` - Get subscription plans (public only for regular users, all for admins)
- `GET /v1/billing/subscription` - Get organization's current subscription
- `POST /v1/billing/subscription` - Update subscription plan
- `GET /v1/billing/usage` - Get usage statistics and quota status
- `GET /v1/billing/usage/history` - Get usage history

#### Configuration Endpoints

- All `/v1/configuration/*` endpoints

#### Workspace Endpoints

- All `/v1/workspace/*` endpoints

#### Mutation Endpoints

- All `/v1/mutate/*` endpoints

#### File Endpoints

- All `/v1/files/*` endpoints

#### API Key Management

- All `/v1/api-keys/*` endpoints

### 3. Platform Admin Endpoints (Platform Admin Authentication Required)

These endpoints require both authentication AND platform admin status. All admin endpoints have a centralized pre-hook that validates platform admin access before processing any request.

#### Admin Billing Management (`/v1/admin/billing/*`)

All endpoints under `/v1/admin/billing/` are protected by a platform admin pre-hook:

##### Plan Management

- `GET /v1/admin/billing/plans` - Get all plans (including private ones)
- `POST /v1/admin/billing/plans` - Create new subscription plan
- `PUT /v1/admin/billing/plans/:planId` - Update existing plan
- `DELETE /v1/admin/billing/plans/:planId` - Delete plan
- `PUT /v1/admin/billing/plans/:planId/default` - Set plan as default

##### Workspace Management

- `GET /v1/admin/billing/workspaces` - Get all workspaces with usage stats
- `GET /v1/admin/billing/workspaces/:orgId` - Get specific organization details
- `POST /v1/admin/billing/workspaces/:orgId/subscription` - Update organization subscription
- `POST /v1/admin/billing/workspaces/:orgId/overrides` - Set custom limits for organization

## Authentication Methods

### Session-Based Authentication

Used by the web application:

- Cookies are set after login via Better Auth
- Sessions are validated on each request
- Email verification is required for most endpoints

### API Key Authentication

Used for programmatic access:

- Pass API key in `Authorization` header: `Bearer YOUR_API_KEY`
- API keys are scoped to organizations
- Can be managed via the web interface or API

## Platform Admin Access

Platform admins are special users with elevated privileges. To check if a user is a platform admin:

```javascript
request.currentUser?.isAdmin;
```

Platform admin status is stored in the `platform_admin` table and linked to user accounts.

## Example Usage

### Public Endpoint (No Auth)

```bash
# Get public plans for marketing site
curl https://api.mutate.app/v1/billing/plans/public
```

### Authenticated Endpoint

```bash
# Get current subscription with API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.mutate.app/v1/billing/subscription

# Get usage statistics with session cookie
curl -H "Cookie: mutate.session=..." \
  https://api.mutate.app/v1/billing/usage
```

### Platform Admin Endpoint

```bash
# Create new plan (requires platform admin)
curl -X POST \
  -H "Authorization: Bearer ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Custom", "priceCents": 9900, ...}' \
  https://api.mutate.app/v1/admin/billing/plans
```

## Security Considerations

1. **Rate Limiting**: All endpoints are rate-limited to 1,000 requests per minute per API key/IP
2. **Email Verification**: Most authenticated endpoints require email verification
3. **CORS**: Configured to only allow requests from approved origins
4. **HTTPS Only**: All API requests must use HTTPS in production
5. **Audit Logging**: All admin actions are logged for security auditing

## Error Responses

### 401 Unauthorized

- No authentication provided
- Invalid session or API key
- Email not verified (when required)

### 403 Forbidden

- Valid authentication but insufficient permissions
- Non-admin accessing admin endpoints

### 404 Not Found

- Resource doesn't exist
- Private plan accessed via public endpoint

### 429 Too Many Requests

- Rate limit exceeded
