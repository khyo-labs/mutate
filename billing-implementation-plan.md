# Conversion Tracking & Billing Implementation Plan

## Current State Analysis

**❌ No Usage Tracking**: The app currently has **no built-in conversion tracking or billing infrastructure**. Here's what I found:

### What Exists:

- **Basic Rate Limiting**: 1,000 requests per minute per API key/IP (generic HTTP rate limiting)
- **Transformation Jobs Table**: Records individual conversions but only for job management, not billing
- **Workspace Multi-tenancy**: Good foundation for per-org billing
- **File Size Limits**: 50MB max file size with async processing for files >10MB
- **Audit Logs**: Basic action logging but not conversion-specific metrics

### What's Missing:

- No conversion count tracking per organization/month
- No subscription plans or billing tiers
- No usage quotas or limits beyond rate limiting
- No concurrent conversion limits
- No tier-based file size restrictions
- No billing/subscription database tables
- No payment processing integration
- No usage analytics or dashboards
- No overage handling or billing alerts
- No pay-per-conversion pricing model
- No super admin override capabilities

## Phase 1: Usage Tracking Infrastructure (Essential)

### 1.1 Database Schema Extensions

- **Create `subscriptions` table**: Store org subscription plans, billing cycles, limits
- **Create `usage_records` table**: Track monthly conversion counts per organization
- **Create `billing_events` table**: Store billing-related events (renewals, upgrades, etc.)
- **Add usage tracking fields** to `organization` table: current plan, billing status

### 1.2 Usage Tracking Service

- **Conversion Counter Service**: Increment usage when transformations complete
- **Monthly Usage Aggregation**: Calculate usage per billing period
- **Usage Quota Enforcement**: Block conversions when limits exceeded
- **Usage Reset Service**: Reset monthly counters on billing cycle

### 1.3 Middleware & Validation

- **Pre-transformation Usage Check**: Validate quota before processing
- **Post-transformation Usage Recording**: Increment counters on completion
- **Usage-based Rate Limiting**: Dynamic limits based on subscription tier

## Phase 2: Subscription Management (Core)

### 2.1 Subscription Plans System

- **Plan Definitions**:
  - Free: 100 conversions/month, 1 concurrent, 10MB max file size
  - Starter: 1,000 conversions/month, 2 concurrent, 25MB max file size
  - Pro: 10,000 conversions/month, 5 concurrent, 50MB max file size
  - Enterprise: unlimited conversions, unlimited concurrent, unlimited file size
- **Plan Management API**: CRUD operations for subscription plans
- **Organization Plan Assignment**: Link orgs to subscription plans
- **Plan Upgrade/Downgrade Logic**: Handle plan changes mid-cycle

### 2.2 Usage Enforcement

- **Quota Middleware**: Check usage before allowing conversions
- **Graceful Degradation**: Soft limits with warnings vs hard blocks
- **Concurrent Conversion Management**: Track and limit active conversions per organization
- **File Size Validation**: Enforce tier-based file size limits with clear error messages
- **Overage Policies**: Define behavior when limits exceeded (block vs pay-per-conversion)
- **Pay-per-conversion Overages**: Charge for conversions beyond monthly limits
- **Super Admin Overrides**: Allow admins to override limits at organization level
- **Usage Alerts**: Notify users at 80%, 90%, 100% usage thresholds

## Phase 3: Billing Integration (Business)

### 3.1 Payment Processing Setup

- **Stripe Integration**: Subscription management and billing
- **Webhook Handlers**: Process Stripe events (payments, failures, etc.)
- **Invoice Generation**: Automated billing based on usage/subscriptions
- **Payment Method Management**: Store and update customer payment info

### 3.2 Billing Dashboard & Analytics

- **Usage Analytics**: Monthly usage trends, conversion type breakdown
- **Billing Dashboard**: Current usage, plan details, billing history
- **Usage Export**: CSV/API export of usage data
- **Billing Notifications**: Email alerts for billing events

## Phase 4: Advanced Features (Enhancement)

### 4.1 Enhanced Billing & Limits

- **Pay-per-conversion Model**: Alternative to subscription tiers
- **Usage-based Overages**: Configurable per-conversion pricing beyond limits
- **Dynamic Concurrent Limits**: Real-time tracking and enforcement
- **Tier-based File Size Enforcement**: Validate uploads against subscription limits
- **Custom Enterprise Plans**: Negotiated limits and pricing
- **Super Admin Dashboard**: Override limits and manage organization-specific rules
- **Multi-currency Support**: Global billing capabilities

### 4.2 Advanced Analytics

- **Conversion Analytics Dashboard**: Usage patterns, peak times, file sizes
- **API Usage Metrics**: Endpoint usage, response times, error rates
- **Organization Insights**: Team usage patterns, cost optimization
- **Predictive Usage**: Forecast future usage and billing

## Implementation Priority & Timeline

**Phase 1 (Essential) - Week 1-2**: Basic usage tracking and quota enforcement
**Phase 2 (Core) - Week 3-4**: Subscription plans and management
**Phase 3 (Business) - Week 5-6**: Payment processing and billing automation
**Phase 4 (Enhancement) - Week 7+**: Advanced analytics and features

## Technical Considerations

- **Data Consistency**: Use transactions for usage tracking to prevent race conditions
- **Performance**: Efficient usage queries with proper indexing
- **Scalability**: Handle high-volume usage tracking without performance impact
- **Reliability**: Robust error handling for billing operations
- **Security**: Secure payment data handling and PCI compliance

## Key Database Tables Needed

```sql
-- Subscription plans
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  monthly_conversion_limit INTEGER, -- NULL for unlimited
  concurrent_conversion_limit INTEGER, -- NULL for unlimited
  max_file_size_mb INTEGER, -- NULL for unlimited
  price_cents INTEGER NOT NULL,
  billing_interval VARCHAR(20) NOT NULL, -- 'month' or 'year'
  overage_price_cents INTEGER, -- Price per conversion over limit
  features JSONB,
  active BOOLEAN DEFAULT true
);

-- Organization subscriptions
CREATE TABLE organization_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id),
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT,
  status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'past_due'
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  -- Super admin overrides (NULL means use plan defaults)
  override_monthly_limit INTEGER,
  override_concurrent_limit INTEGER,
  override_max_file_size_mb INTEGER,
  override_overage_price_cents INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Monthly usage tracking
CREATE TABLE usage_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id),
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  conversion_count INTEGER DEFAULT 0,
  overage_count INTEGER DEFAULT 0, -- Conversions beyond plan limit
  conversion_type_breakdown JSONB, -- {"XLSX_TO_CSV": 50, "DOCX_TO_PDF": 25}
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, month, year)
);

-- Active conversion tracking for concurrent limits
CREATE TABLE active_conversions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  started_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id)
);
```

## API Endpoints Needed

```typescript
// Usage tracking
GET /v1/workspaces/{id}/usage - Get current usage
GET /v1/workspaces/{id}/usage/history - Get usage history

// Subscription management
GET /v1/workspaces/{id}/subscription - Get current subscription
POST /v1/workspaces/{id}/subscription - Create/update subscription
DELETE /v1/workspaces/{id}/subscription - Cancel subscription

// Billing
GET /v1/workspaces/{id}/billing - Get billing info
POST /v1/workspaces/{id}/billing/payment-method - Update payment method
GET /v1/workspaces/{id}/billing/invoices - Get billing history
```

## Services Architecture

```typescript
// Core services needed
- UsageTrackingService: Track and aggregate conversion usage
- SubscriptionService: Manage subscription plans and assignments
- BillingService: Handle Stripe integration and billing logic
- QuotaEnforcementService: Validate usage, concurrent, and file size limits
- ConcurrencyService: Track and enforce concurrent conversion limits
- OverageService: Handle pay-per-conversion billing beyond limits
- AdminOverrideService: Manage super admin organization-level overrides
- AnalyticsService: Generate usage and billing analytics
```

This plan provides a comprehensive roadmap for implementing usage tracking and billing while maintaining the existing functionality and architecture of the Mutate platform.
