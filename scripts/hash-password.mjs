#!/usr/bin/env node

// Helper script to compute password hashes for app_users.
// Usage:
//   node scripts/hash-password.mjs <username> <password>
//
// This uses the same scheme as AuthService:
//   SHA-256(username:password:map-manager-v1) -> hex string

import crypto from 'crypto';

const [, , username, password] = process.argv;

if (!username || !password) {
    console.error('Usage: node scripts/hash-password.mjs <username> <password>');
    process.exit(1);
}

const input = `${username}:${password}:map-manager-v1`;
const hash = crypto.createHash('sha256').update(input).digest('hex');
console.log(hash);

