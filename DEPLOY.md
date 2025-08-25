# Deployment Guide - Render.com

This guide will help you deploy the API, PostgreSQL, and Redis to Render.com.

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)

## Deployment Options

### Option 1: Using render.yaml (Recommended)

1. **Push the `render.yaml` file** to your repository root
2. **Connect your repo** to Render via the dashboard
3. **Deploy as Blueprint** - Render will automatically create all services

### Option 2: Manual Setup

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Set these values:
   - **Name**: `convert-postgres`
   - **Database**: `convert_db`
   - **User**: `convert_user`
   - **Region**: Oregon (or preferred)
   - **Plan**: Starter ($7/month)

#### Step 2: Create Redis Instance

1. Go to Render Dashboard → "New" → "Redis"
2. Set these values:
   - **Name**: `convert-redis`
   - **Region**: Oregon (same as database)
   - **Plan**: Starter ($7/month)

#### Step 3: Deploy API Service

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Set these values:
   - **Name**: `convert-api`
   - **Environment**: Node
   - **Region**: Oregon (same as database/redis)
   - **Branch**: `main`
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run db:migrate:prod && npm start`

#### Step 4: Configure Environment Variables

Add these environment variables to your API service:

```bash
# Basic Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=10000

# Database (get from your PostgreSQL service)
DATABASE_URL=postgresql://convert_user:password@hostname:port/convert_db
DATABASE_MAX_CONNECTIONS=10

# Redis (get from your Redis service)
REDIS_URL=redis://hostname:port

# JWT Configuration (generate secure secrets)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-chars-long
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# CORS (update with your frontend domain)
CORS_ORIGINS=https://your-frontend-domain.onrender.com

# File Configuration
STORAGE_TYPE=local
STORAGE_PATH=./uploads
MAX_FILE_SIZE=52428800
FILE_TTL=86400

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute

# Logging
LOG_LEVEL=info
```

## Getting Connection Strings

### PostgreSQL Connection String
1. Go to your PostgreSQL service in Render
2. Copy the "External Database URL"
3. Format: `postgresql://user:password@hostname:port/database`

### Redis Connection String
1. Go to your Redis service in Render
2. Copy the "Redis URL"
3. Format: `redis://hostname:port`

## Frontend Configuration

Update your frontend's API base URL to point to your deployed API:

```bash
VITE_API_BASE_URL=https://your-api-domain.onrender.com
```

## Important Notes

### 1. **Free Tier Limitations**
- Services spin down after 15 minutes of inactivity
- First request after spin-down will be slow (30-60 seconds)
- Consider paid plans for production use

### 2. **Database Migrations**
- Migrations run automatically on deployment
- Database schema is created on first deployment
- Existing data is preserved on updates

### 3. **File Storage**
- Currently using local storage (`./uploads`)
- Files are ephemeral on free tier (deleted on service restart)
- Consider AWS S3 for production file storage

### 4. **SSL/TLS**
- All Render services use HTTPS by default
- No additional SSL configuration needed

## Monitoring

1. **Logs**: View in Render dashboard under your service
2. **Health Check**: `https://your-api-domain.onrender.com/api/v1/health`
3. **Metrics**: Available in Render dashboard

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check that `package.json` scripts are correct
   - Ensure all dependencies are listed
   - Verify Node.js version compatibility

2. **Database Connection Errors**:
   - Verify `DATABASE_URL` format
   - Check PostgreSQL service is running
   - Ensure database name matches

3. **Redis Connection Errors**:
   - Verify `REDIS_URL` format
   - Check Redis service is running

4. **Environment Variables**:
   - All required env vars must be set
   - JWT_SECRET should be at least 32 characters
   - No spaces in environment variable names

### Useful Commands:

```bash
# Test database connection locally
npm run db:migrate

# Build locally to test
npm run build

# Run production build locally
npm start
```

## Security Checklist

- [ ] JWT_SECRET is cryptographically secure (32+ chars)
- [ ] DATABASE_URL contains strong password
- [ ] CORS_ORIGINS only includes your domains
- [ ] Rate limiting is configured appropriately
- [ ] File upload limits are set correctly

## Cost Estimation

- **PostgreSQL Starter**: $7/month
- **Redis Starter**: $7/month
- **Web Service Starter**: $7/month
- **Total**: ~$21/month

Free alternatives available but with limitations (services sleep, limited
resources).
