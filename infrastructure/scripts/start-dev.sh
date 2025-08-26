#!/bin/bash

# Start development infrastructure for Mutate Platform
set -e

echo "🚀 Starting Mutate Platform development infrastructure..."

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
echo "📦 Starting PostgreSQL, Redis, and admin tools..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --wait

echo "✅ Development infrastructure is ready!"
echo ""
echo "📋 Services available:"
echo "  🐘 PostgreSQL:     localhost:5432"
echo "  🗄️  Redis:          localhost:6379"
echo "  🌐 Adminer (DB UI): http://localhost:8080"
echo "  🔴 Redis UI:       http://localhost:8081 (admin/admin)"
echo "  📊 BullMQ Board:   http://localhost:3001"
echo ""
echo "💡 Database connection:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: mutate_db_dev"
echo "  User: postgres"
echo "  Password: password"
echo ""
echo "🛑 To stop: ./stop-dev.sh or docker-compose down"
