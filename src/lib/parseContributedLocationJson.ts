import type { Location } from '../types/Location';

export type ParseContributedResult =
    | { ok: true; location: Location }
    | { ok: false; error: string };

function asString(v: unknown, fallback = ''): string {
    if (v == null) return fallback;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return fallback;
}

function asNumber(v: unknown, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = parseFloat(v);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}

function asStringArray(v: unknown): string[] {
    if (Array.isArray(v)) {
        return v.map((x) => String(x).trim()).filter(Boolean);
    }
    if (typeof v === 'string') {
        return v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
}

/**
 * Parses JSON from the public contribute form download (`{ ...Location, ID? }`).
 * Accepts PascalCase keys as exported; a few camelCase aliases for latitude/longitude.
 */
export function parseContributedLocationJson(text: string): ParseContributedResult {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return { ok: false, error: 'Could not parse JSON. Check that the file is valid UTF-8 JSON.' };
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ok: false, error: 'Expected one JSON object (the exported location), not an array.' };
    }

    const o = raw as Record<string, unknown>;

    const name = asString(o.Name ?? o.name, '').trim();
    if (!name) {
        return { ok: false, error: 'Missing required field: Name' };
    }

    const lat = asNumber(o.Latitude ?? o.latitude, NaN);
    const lng = asNumber(o.Longitude ?? o.longitude, NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { ok: false, error: 'Latitude and Longitude must be valid numbers.' };
    }

    const categories = asStringArray(o.Categories ?? o.categories);
    const lastChecked = asString(o['Last Checked'] ?? o.lastChecked ?? o['last_checked'], '');
    const defaultDate = new Date().toISOString().split('T')[0];

    const location: Location = {
        ID: '',
        Name: name,
        Latitude: lat,
        Longitude: lng,
        Description: asString(o.Description ?? o.description, ''),
        Website: asString(o.Website ?? o.website, ''),
        Tags: asString(o.Tags ?? o.tags, ''),
        Image: asString(o.Image ?? o.image, ''),
        Address: asString(o.Address ?? o.address, ''),
        Phone: asString(o.Phone ?? o.phone, ''),
        Email: asString(o.Email ?? o.email, ''),
        Categories: categories,
        'Contact Person': asString(o['Contact Person'] ?? o.contactPerson ?? o.contact_person, ''),
        'Last Checked': lastChecked || defaultDate,
        'Additional Info': asString(o['Additional Info'] ?? o.additionalInfo ?? o.additional_info, ''),
    };

    return { ok: true, location };
}
