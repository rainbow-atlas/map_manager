#!/usr/bin/env node
/**
 * One-time migration: Google Sheets → Supabase
 *
 * Supports multiple tabs. Export each tab as a separate CSV, then run:
 *   npm run migrate -- locations.csv categories.csv tags.csv
 *
 * - Locations: CSV with Name, Latitude, Longitude, etc.
 * - Categories: CSV with category names (one per row, first column)
 * - Tags: CSV with tag names (one per row, first column)
 *
 * Type is auto-detected from filename (contains "location", "categor", or "tag").
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import Papa from 'papaparse';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Map CSV/Sheet row (header names) to Supabase locations column names
function rowToLocationDb(row) {
    const get = (key) => row[key] ?? row[key?.replace(/ /g, '_')] ?? '';
    const str = (v) => {
        const s = String(v ?? '').trim();
        return s === '#ERROR!' ? '' : s;
    };
    const num = (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };
    return {
        name: str(get('Name')),
        latitude: num(get('Latitude')),
        longitude: num(get('Longitude')),
        description: str(get('Description')),
        website: str(get('Website')),
        tags: str(get('Tags')),
        image: str(get('Image')),
        address: str(get('Address')),
        phone: str(get('Phone')),
        email: String(get('Email') || '').trim(),
        category: String(get('Category') || '').trim(),
        contact_person: String(get('Contact Person') || '').trim(),
        last_checked: String(get('Last Checked') || '').trim(),
        additional_info: String(get('Additional Info') || '').trim(),
    };
}

// Detect table type from filename (case-insensitive)
function detectType(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('location')) return 'locations';
    if (lower.includes('categor')) return 'categories';
    if (lower.includes('tag')) return 'tags';
    return null;
}

async function migrateLocations(csvPath) {
    const content = readFileSync(csvPath, 'utf-8');
    const { data: rows, errors } = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
    });
    if (errors?.length) {
        console.error('CSV parse errors:', errors);
        process.exit(1);
    }
    if (!rows?.length) {
        console.log('  No rows.');
        return;
    }
    const toInsert = rows.map(rowToLocationDb).filter((r) => r.name);
    if (!toInsert.length) {
        console.log('  No valid location rows (need Name).');
        return;
    }
    const { data, error } = await supabase.from('locations').insert(toInsert).select('id');
    if (error) {
        console.error('  Supabase error:', error.message);
        process.exit(1);
    }
    console.log(`  Inserted ${data?.length ?? 0} locations.`);
}

const CATEGORY_HEADER_SKIP = new Set(['active categories', 'category', 'categories', 'name']);

async function migrateCategories(csvPath) {
    const content = readFileSync(csvPath, 'utf-8');
    // Single-column files often have no delimiter; parse line-by-line for reliability
    const names = new Set();
    for (const line of content.split(/\r?\n/)) {
        const name = line.trim();
        if (!name || CATEGORY_HEADER_SKIP.has(name.toLowerCase())) continue;
        names.add(name);
    }
    if (!names.size) {
        console.log('  No rows.');
        return;
    }
    const toInsert = [...names].map((name) => ({ name }));
    const { error } = await supabase.from('categories').upsert(toInsert, {
        onConflict: 'name',
        ignoreDuplicates: true,
    });
    if (error) {
        console.error('  Supabase error:', error.message);
        process.exit(1);
    }
    console.log(`  Upserted ${names.size} categories.`);
}

// Header-like words to skip when the first row is used as column name (e.g. tags with no header)
const TAG_HEADER_SKIP = new Set(['name', 'tag', 'tags', 'category', 'categories', 'active tags']);

async function migrateTags(csvPath) {
    const content = readFileSync(csvPath, 'utf-8');
    const names = new Set();
    for (const line of content.split(/\r?\n/)) {
        // First column only (in case CSV has extra commas)
        const name = (line.split(',')[0] ?? '').trim();
        if (name && !TAG_HEADER_SKIP.has(name.toLowerCase())) names.add(name);
    }
    if (!names.size) {
        console.log('  No rows.');
        return;
    }
    const toInsert = [...names].map((name) => ({ name }));
    const { error } = await supabase.from('tags').upsert(toInsert, {
        onConflict: 'name',
        ignoreDuplicates: true,
    });
    if (error) {
        console.error('  Supabase error:', error.message);
        process.exit(1);
    }
    console.log(`  Upserted ${names.size} tags.`);
}

async function main() {
    const args = process.argv.slice(2);
    if (!args.length) {
        console.log('Usage: npm run migrate -- <file1.csv> [file2.csv] [file3.csv]');
        console.log('');
        console.log('Export each Google Sheet tab as CSV:');
        console.log('  1. Click the tab (e.g. Sheet1, Categories, Tags)');
        console.log('  2. File → Download → Comma-separated values (.csv)');
        console.log('  3. Run: npm run migrate -- Sheet1.csv Categories.csv Tags.csv');
        console.log('');
        console.log('Type is detected from filename (location, categor, or tag).');
        return;
    }

    for (const csvPath of args) {
        const type = detectType(csvPath);
        if (!type) {
            console.log(`Skipping ${csvPath} (cannot detect type - use location/categor/tag in filename)`);
            continue;
        }
        console.log(`\n[${type}] ${csvPath}`);
        if (type === 'locations') await migrateLocations(csvPath);
        else if (type === 'categories') await migrateCategories(csvPath);
        else if (type === 'tags') await migrateTags(csvPath);
    }

    console.log('\nDone.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
