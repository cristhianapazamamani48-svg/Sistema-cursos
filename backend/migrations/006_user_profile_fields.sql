-- Migration 006: Add bio and phone fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
