#!/bin/bash

# Backup development database
set -e

# Create backup directory
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/mutate_db_backup_$TIMESTAMP.sql"

echo "💾 Creating database backup..."

# Create backup using docker exec
docker exec mutate_postgres pg_dump -U postgres -d mutate_db_dev > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "🔄 To restore: ./restore-dev.sh ${BACKUP_FILE}.gz"
