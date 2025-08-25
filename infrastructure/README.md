# Convert Platform Infrastructure

Local development infrastructure for the Convert platform using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Start development infrastructure:**

   ```bash
   ./scripts/start-dev.sh
   ```

2. **Stop infrastructure:**

   ```bash
   ./scripts/stop-dev.sh
   ```

3. **Clean up all data (destructive):**
   ```bash
   ./scripts/cleanup-dev.sh
   ```

## Services

### Core Services

| Service        | Port | Description           |
| -------------- | ---- | --------------------- |
| **PostgreSQL** | 5432 | Primary database      |
| **Redis**      | 6379 | Cache & message queue |

### Admin & Monitoring

| Service             | Port | URL                   | Credentials               |
| ------------------- | ---- | --------------------- | ------------------------- |
| **Adminer**         | 8080 | http://localhost:8080 | See connection info below |
| **Redis Commander** | 8081 | http://localhost:8081 | admin/admin               |
| **BullMQ Board**    | 3001 | http://localhost:3001 | -                         |

## Database Connection

Connect to PostgreSQL using:

- **Host:** localhost
- **Port:** 5432
- **Database:** convert_db_dev (development) or convert_db (production)
- **Username:** postgres
- **Password:** password

### Connection URLs

```bash
# Development
DATABASE_URL=postgresql://postgres:password@localhost:5432/convert_db_dev

# Production (when using main docker-compose.yml)
DATABASE_URL=postgresql://postgres:password@localhost:5432/convert_db
```

## Scripts Reference

### Core Operations

- `./scripts/start-dev.sh` - Start all development services
- `./scripts/stop-dev.sh` - Stop all services
- `./scripts/cleanup-dev.sh` - Remove all data and containers

### Database Management

- `./scripts/backup-dev.sh` - Create database backup
- `./scripts/restore-dev.sh <file>` - Restore from backup

## Docker Compose Files

- `docker-compose.yml` - Base configuration
- `docker-compose.dev.yml` - Development overrides
- `.env` - Environment variables

## Usage Patterns

### Development Workflow

```bash
# Start infrastructure
./scripts/start-dev.sh

# In another terminal, start your API
cd apps/api
pnpm dev

# Access admin tools
open http://localhost:8080  # Database UI
open http://localhost:8081  # Redis UI
open http://localhost:3001  # BullMQ Dashboard
```

### Database Operations

```bash
# Create backup before major changes
./scripts/backup-dev.sh

# Reset database if needed
./scripts/cleanup-dev.sh
./scripts/start-dev.sh

# Restore from backup
./scripts/restore-dev.sh ./backups/convert_db_backup_20241201_120000.sql.gz
```

## Data Persistence

Data is stored in Docker volumes:

- `convert_postgres_dev_data` - PostgreSQL data
- `convert_redis_dev_data` - Redis data

These volumes persist when containers are stopped but are removed with `cleanup-dev.sh`.

## Networking

All services run on the `convert_network` Docker network and can communicate using service names:

- `postgres:5432`
- `redis:6379`

## Environment Configuration

The `.env` file contains default values. Override by:

1. Modifying `.env` file
2. Setting environment variables before running scripts
3. Using `-f` flag with custom compose files

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# View logs
cd docker && docker-compose logs -f
```

### Database connection issues

```bash
# Check if PostgreSQL is ready
docker exec convert_postgres pg_isready -U postgres

# Connect to database directly
docker exec -it convert_postgres psql -U postgres -d convert_db_dev
```

### Reset everything

```bash
# Nuclear option - removes all data
./scripts/cleanup-dev.sh
./scripts/start-dev.sh
```

## Production Considerations

For production deployment:

1. Use `docker-compose.yml` without dev overrides
2. Change default passwords in `.env`
3. Use proper secrets management
4. Configure backup strategies
5. Set up monitoring and logging
6. Use external volumes for data persistence

## Security Notes

⚠️ **Development Only**: Default credentials are for development only. Never use these in production:

- PostgreSQL: postgres/password
- Redis Commander: admin/admin

## Integration with API

Update your API's `.env` file to use the local infrastructure:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/convert_db_dev

# Redis
REDIS_URL=redis://localhost:6379
```
