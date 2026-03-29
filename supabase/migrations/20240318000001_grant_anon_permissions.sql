-- Grant anon role permission to access tables (required for publishable/anon key)
-- Run this in the Supabase SQL Editor if you get "permission denied for table"

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON change_logs TO anon;

-- Allow anon to use sequences (needed for SERIAL primary keys on insert)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
