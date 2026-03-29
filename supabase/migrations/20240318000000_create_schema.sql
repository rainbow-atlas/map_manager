-- Map Manager Supabase Schema
-- Run this in the Supabase SQL Editor or via: supabase db push

-- Enable UUID extension (optional, we use serial for simplicity)
-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    website TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    image TEXT DEFAULT '',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    category TEXT DEFAULT '',
    contact_person TEXT DEFAULT '',
    last_checked TEXT DEFAULT '',
    additional_info TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories lookup table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Tags lookup table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Change log for category/tag add/rename/delete
CREATE TABLE IF NOT EXISTS change_logs (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT DEFAULT '',
    new_value TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories if table is empty
INSERT INTO categories (name)
SELECT * FROM (VALUES
    ('Restaurant'),
    ('Bar'),
    ('Cafe'),
    ('Shop'),
    ('Community Center')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

-- Seed default tags if table is empty
INSERT INTO tags (name)
SELECT * FROM (VALUES
    ('Historic'),
    ('Family-Friendly'),
    ('Accessible'),
    ('Pet-Friendly'),
    ('Parking')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM tags LIMIT 1);

-- Row Level Security: enable RLS, then add permissive policies for anon key
-- (App uses env-based auth; Supabase anon key is used for data access)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (app handles auth via AuthService)
CREATE POLICY "Allow all for locations" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for change_logs" ON change_logs FOR ALL USING (true) WITH CHECK (true);
