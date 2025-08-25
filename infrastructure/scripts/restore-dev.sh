#!/bin/bash

# Restore development database from backup
set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -la "$(dirname "$0")/../backups/" 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restoring database from backup..."
echo "📁 Backup file: $BACKUP_FILE"
echo ""

# Confirm with user
read -p "This will replace all data in the development database. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Check if backup is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Extracting compressed backup..."
    gunzip -c "$BACKUP_FILE" | docker exec -i convert_postgres psql -U postgres -d convert_db_dev
else
    echo "📦 Restoring uncompressed backup..."
    cat "$BACKUP_FILE" | docker exec -i convert_postgres psql -U postgres -d convert_db_dev
fi

echo "✅ Database restored successfully!"