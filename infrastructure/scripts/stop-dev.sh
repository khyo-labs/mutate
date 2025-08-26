#!/bin/bash

# Stop development infrastructure for mutate
set -e

echo "🛑 Stopping mutate development infrastructure..."

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

# Stop and remove containers
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

echo "✅ Development infrastructure stopped!"
echo ""
echo "💡 To start again: ./start-dev.sh"
echo "🗑️  To remove all data: ./cleanup-dev.sh"
