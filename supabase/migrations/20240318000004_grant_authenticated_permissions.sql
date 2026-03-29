-- Grant authenticated role access to tables (required when using Supabase Auth)
-- Logged-in users make requests as "authenticated" role, not "anon"
-- Run this in the Supabase SQL Editor if you get "permission denied for table" after login

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON change_logs TO authenticated;

-- Allow authenticated to use sequences (needed for SERIAL primary keys on insert)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
