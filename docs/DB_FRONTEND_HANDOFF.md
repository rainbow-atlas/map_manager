## Supabase DB – Frontend Handoff (Bare Essentials)

### 1. What exists in the database

- **Core tables**
  - **locations**: main map entries.
    - Key fields: `id`, `name`, `latitude`, `longitude`, `description`, `website`, `tags` (free text), `image`, `address`, `phone`, `email`, `category` (free text), `contact_person`, `last_checked`, `additional_info`, `created_at`.
  - **categories**: list of allowed category names.  
    - Fields: `id`, `name` (unique).
  - **tags**: list of allowed tag names.  
    - Fields: `id`, `name` (unique).
  - **change_logs**: audit for taxonomy/other changes.  
    - Fields: `id`, `source`, `action`, `old_value`, `new_value`, `created_at`.
- **Auth / roles–related tables**
  - **user_roles**: connects Supabase `auth.users.id` → app role.  
    - Fields: `user_id` (FK to `auth.users.id`), `role` in `('admin','editor','viewer','guest')`.
    - RLS: a user can only read **their own** row; `service_role` can do everything.
  - **app_users**: custom username/password store used by helper scripts / manual flows.  
    - Fields: `id`, `username` (unique), `password_hash` (SHA-256 of `username:password:map-manager-v1`), `role`, `created_at`.  
    - RLS: anyone (anon + authenticated) can **select**; writes are meant to be done from the backend / Supabase SQL, not the browser.

- **Conceptual relations**
  - `locations.category` ↔ `categories.name` (string match, **no FK**).
  - `locations.tags` ↔ `tags.name` (stored as a free-text string list, **no FK**).
  - `user_roles.user_id` → `auth.users.id` (real FK, managed by Supabase Auth + scripts).

### 2. Who can access what (from the frontend)

- **Supabase roles in play**
  - **anon**: used with the public/anon key in the browser **before** login.
  - **authenticated**: same browser code, but once a user logs in via Supabase Auth.
  - **service_role**: **never** used in the frontend; only on the backend / scripts.

- **RLS / GRANTS summary**
  - `locations`, `categories`, `tags`, `change_logs`:
    - RLS enabled, but have permissive policies: **anon + authenticated can full CRUD**.
    - App is expected to enforce who’s allowed to edit/delete in frontend code.
  - `user_roles`:
    - RLS: a logged-in user can only `SELECT` their own `user_roles` row.
    - `authenticated` has `SELECT` on this table; `service_role` can do all operations.
  - `app_users`:
    - RLS: anyone can `SELECT` (read-only from frontend).
    - `anon` + `authenticated` have `SELECT`; writes are intended only via SQL / scripts.

### 3. How to connect from the frontend

Make sure these env vars exist (Vite-style names are examples, adjust to your setup):

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4. Canonical query examples

#### 4.1 Locations CRUD

```ts
import { supabase } from '../lib/supabase';

export async function getLocations(category?: string) {
  let q = supabase
    .from('locations')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) q = q.eq('category', category);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createLocation(payload: {
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  tags?: string; // e.g. "Historic,Family-Friendly"
  description?: string;
}) {
  const { data, error } = await supabase
    .from('locations')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLocation(id: number, patch: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('locations')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### 4.2 Taxonomy (categories + tags)

```ts
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}
```

#### 4.3 Current user role (Supabase Auth path)

If you’re using Supabase Auth:

```ts
export async function getCurrentUserRole() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}
```

#### 4.4 Custom username/password path (`app_users`)

If you’re using `app_users` to check credentials manually, the flow is:

1. Fetch the row by `username` from `app_users`.
2. Locally compute `SHA-256(username:password:map-manager-v1)` in the browser.
3. Compare to `password_hash`; if equal, treat login as successful and use `role`.

```ts
export async function getAppUserByUsername(username: string) {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data; // may be null if not found
}
```

> **Rule of thumb for the frontend:**  
> - Use `locations`, `categories`, `tags`, `change_logs` directly for app data.  
> - Use `user_roles` (and/or `app_users`) only to derive the current user’s **role** and gate UI / actions.  
> - Never use the Supabase **service role** key in the browser; only the anon/public key.

