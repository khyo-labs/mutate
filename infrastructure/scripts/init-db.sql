-- Initialize Mutate Platform Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases for testing if needed
-- CREATE DATABASE mutate_db_test;

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON DATABASE mutate_db TO postgres;

-- Create indexes that might be helpful for performance
-- Note: The actual tables will be created by Drizzle migrations

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Mutate Platform database initialized successfully';
END $$;
