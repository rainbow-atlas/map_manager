#!/usr/bin/env node
/**
 * One-time setup: Create Supabase Auth users and assign roles.
 *
 * No email verification: users are created with email_confirm: true.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (from Supabase Dashboard → Settings → API).
 *
 * Username-based logins (admin, editor) map to placeholder emails:
 *   admin  → admin@rainbow-atlas.local
 *   editor → editor@rainbow-atlas.local
 *
 * Email users keep their email as login.
 *
 * Run: npm run create-users
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('Get the service role key from Supabase Dashboard → Settings → API');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const USERNAME_TO_EMAIL = {
    admin: 'admin@rainbow-atlas.local',
    editor: 'editor@rainbow-atlas.local',
};

const USERS = [
    { username: 'admin', password: 'rainbow2024!', role: 'admin' },
    { username: 'editor', password: 'atlas2024!', role: 'editor' },
    { email: 'erik.pfefferkorn@aidshilfe-ooe.at', password: 'queermap123', role: 'editor' },
    { email: 'bernhard.resch@aidshilfe-ooe.at', password: 'queermap123', role: 'editor' },
    { email: 'g.niederleuthner@hosilinz.at', password: 'queermap123', role: 'editor' },
];

function toLoginEmail(user) {
    if (user.email) return user.email;
    return USERNAME_TO_EMAIL[user.username] || `${user.username}@rainbow-atlas.local`;
}

async function main() {
    console.log('Creating Supabase Auth users...\n');

    for (const user of USERS) {
        const email = toLoginEmail(user);
        const password = user.password;
        const role = user.role;

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (error) {
            if (error.message?.includes('already been registered')) {
                console.log(`  ${email} – already exists, upserting role`);
                const { data: existing } = await supabase.auth.admin.listUsers();
                const found = existing?.users?.find((u) => u.email === email);
                if (found) {
                    await supabase.from('user_roles').upsert({ user_id: found.id, role }, { onConflict: 'user_id' });
                }
            } else {
                console.error(`  ${email} – error:`, error.message);
            }
            continue;
        }

        if (data?.user?.id) {
            const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: data.user.id, role });
            if (roleErr) {
                console.error(`  ${email} – created but failed to set role:`, roleErr.message);
            } else {
                console.log(`  ${email} – created (${role})`);
            }
        }
    }

    console.log('\nDone. Users can now log in with email + password.');
    console.log('Username logins: use admin@rainbow-atlas.local, editor@rainbow-atlas.local, etc.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
