-- WhyteBox PostgreSQL initialization script
-- Runs once when the container is first created.
-- The application's Alembic migrations handle schema creation;
-- this script only sets up extensions and performance settings.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fast text search (used by model name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgcrypto for password hashing helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set default timezone
SET timezone = 'UTC';

-- Made with Bob
