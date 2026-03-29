-- Simple application users table for username/password auth
-- Passwords are stored as SHA-256(username:password:map-manager-v1) hex strings,
-- computed on the client and by helper scripts.

create table if not exists public.app_users (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    password_hash text not null,
    role text not null check (role in ('admin', 'editor', 'viewer', 'guest')),
    created_at timestamptz default now()
);

alter table public.app_users enable row level security;

-- The frontend only needs to read app_users for login.
-- Writes (creating/updating users) should be done via Supabase SQL/editor
-- which runs with elevated privileges.
drop policy if exists "Anyone can read app_users" on public.app_users;

create policy "Anyone can read app_users"
    on public.app_users
    for select
    using (true);

grant select on public.app_users to anon;
grant select on public.app_users to authenticated;

