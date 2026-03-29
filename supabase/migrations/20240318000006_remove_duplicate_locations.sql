-- Remove duplicate locations (keep the first inserted: lowest id)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dfbxllyfbmmojxjxbhzv/sql/new

DELETE FROM locations a
USING locations b
WHERE a.id > b.id
  AND a.name = b.name
  AND a.latitude = b.latitude
  AND a.longitude = b.longitude;
