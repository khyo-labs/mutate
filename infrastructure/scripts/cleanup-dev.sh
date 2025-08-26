#!/bin/bash

# Clean up development infrastructure (removes all data!)
set -e

echo "🧹 Cleaning up Mutate Platform development infrastructure..."
echo "⚠️  This will remove ALL data in the development databases!"
echo ""

# Confirm with user
read -p "Are you sure? This cannot be undone. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

# Stop containers and remove volumes
echo "🛑 Stopping containers..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Remove volumes explicitly
echo "🗑️  Removing volumes..."
docker volume rm mutate_postgres_dev_data 2>/dev/null || echo "PostgreSQL dev volume not found"
docker volume rm mutate_redis_dev_data 2>/dev/null || echo "Redis dev volume not found"

# Remove network
echo "🌐 Removing network..."
docker network rm mutate_network 2>/dev/null || echo "Network not found"

# Prune unused containers and images
echo "🧽 Cleaning up Docker resources..."
docker system prune -f

echo "✅ Cleanup completed!"
echo ""
echo "💡 To start fresh: ./start-dev.sh"
