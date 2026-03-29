# Auth Migration: Supabase Auth

Authentication now uses **Supabase Auth** instead of the env-based `VITE_USERS_CONFIG`. Passwords are stored securely server-side.

## Setup Steps

### 1. Run the migration

Apply the `user_roles` migration to your Supabase project:

```bash
supabase db push
```

Or run the SQL manually in the Supabase SQL Editor from `supabase/migrations/20240318000002_user_roles.sql`.

### 2. Create users

Add your service role key to `.env`:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get it from **Supabase Dashboard → Settings → API** (the `service_role` key, **not** the anon key).

Then run:

```bash
npm run create-users
```

This creates the users defined in `scripts/create-supabase-users.mjs`. Edit that file to add or change users before running.

### 3. Remove old config (optional)

Remove `VITE_USERS_CONFIG` from your `.env` file if it still exists.

## Login

- **Username logins** (admin, editor, viewer, guest) → use placeholder emails:
  - `admin@rainbow-atlas.local` / `rainbow2024!`
  - `editor@rainbow-atlas.local` / `atlas2024!`
  - `viewer@rainbow-atlas.local` / `map2024!`
  - `guest@rainbow-atlas.local` / `welcome2024!`
- **Email users** → use their email and password directly

## Adding users later

1. Edit `scripts/create-supabase-users.mjs` and add the new user to the `USERS` array.
2. Run `npm run create-users` again. Existing users will be skipped; new users will be created.
