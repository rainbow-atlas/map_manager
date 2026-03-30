import { Location, LocationFormData } from '../types/Location';
import { supabase } from '../lib/supabase';
import { AuthService } from './AuthService';

function locationAuditInsert(): { created_by?: string; updated_by?: string } {
    const id = AuthService.getCurrentUser()?.id;
    if (!id) return {};
    return { created_by: id, updated_by: id };
}

function locationAuditUpdate(): { updated_by?: string } {
    const id = AuthService.getCurrentUser()?.id;
    if (!id) return {};
    return { updated_by: id };
}

/** Used by the anonymous “download JSON” form when the app has not loaded categories/tags from Supabase. */
export const PUBLIC_FORM_DEFAULT_CATEGORIES: string[] = [
    'Restaurant',
    'Bar',
    'Cafe',
    'Shop',
    'Community Center',
];
const DEFAULT_CATEGORIES = [...PUBLIC_FORM_DEFAULT_CATEGORIES];

const DEFAULT_TAGS = [
    'AIDS',
    'HIV',
    'STIs',
    'Fetisch',
    'Cruising',
    'Pride-Parade',
    'Religion',
    'Inter*',
    'Jung',
    'Kultur',
    'Kino',
    'Kunst',
    'Ausstellung',
    'lgbtiqa*',
    'Männer',
    'Frauen',
    'nonbinary',
    'PrEP',
    'Sex',
    'Sexualität',
    'Sport',
    'Therapie',
    'trans',
    'Test',
    'Hotline',
    'Tanzen',
    'Workshop',
    'Coming Out',
    'Party',
    'Drag',
    'Show',
    'Vorträge',
];

export const PUBLIC_FORM_DEFAULT_TAGS: string[] = [...DEFAULT_TAGS];

export interface CategoryDefinition {
    name: string;
    color: string;
}

interface LocationRow {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    description: string;
    website: string;
    tags: string;
    image: string;
    address: string;
    phone: string;
    email: string;
    instagram: string;
    facebook: string;
    additional_links: string[] | null;
    category: string;
    contact_person: string;
    last_checked: string;
    additional_info: string;
}

interface LocationRowFetched extends LocationRow {
    updated_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    created_by_user?: { username: string } | null;
    updated_by_user?: { username: string } | null;
    location_categories?: Array<{
        created_at?: string;
        categories: { name: string } | null;
    } | null>;
}

function dedupePreserveOrder(names: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of names) {
        const t = raw.trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
    }
    return out;
}

/** Legacy `locations.category` column: ordered names (primary first), comma-separated. */
function legacyCategoryCsv(names: string[]): string {
    return dedupePreserveOrder(names).join(', ');
}

function categoriesFromRow(row: LocationRowFetched): string[] {
    const legacy = (row.category ?? '').trim();
    const fromRows = row.location_categories;
    const junctionRows = Array.isArray(fromRows) ? fromRows : [];

    const namesFromJunction = [...junctionRows]
        .sort((a, b) => {
            const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return ta - tb;
        })
        .map((j) => j?.categories?.name)
        .filter((n): n is string => Boolean(n?.trim()))
        .map((n) => n.trim());

    if (legacy) {
        const fromLegacy = dedupePreserveOrder(legacy.split(',').map((s) => s.trim()).filter(Boolean));
        const set = new Set(fromLegacy);
        const extra = namesFromJunction.filter((n) => !set.has(n));
        return dedupePreserveOrder([...fromLegacy, ...extra]);
    }
    if (namesFromJunction.length) {
        return dedupePreserveOrder(namesFromJunction);
    }
    return [];
}

function rowToLocation(row: LocationRowFetched): Location {
    return {
        ID: String(row.id),
        Name: row.name,
        Latitude: row.latitude,
        Longitude: row.longitude,
        Description: row.description ?? '',
        Website: row.website ?? '',
        Tags: row.tags ?? '',
        Image: row.image ?? '',
        Address: row.address ?? '',
        Phone: row.phone ?? '',
        Email: row.email ?? '',
        Instagram: row.instagram ?? '',
        Facebook: row.facebook ?? '',
        'Additional Links': row.additional_links ?? [],
        Categories: categoriesFromRow(row),
        'Contact Person': row.contact_person ?? '',
        'Last Checked': row.last_checked ?? '',
        'Additional Info': row.additional_info ?? '',
        createdByUsername: row.created_by_user?.username,
        lastEditedByUsername: row.updated_by_user?.username,
        recordUpdatedAt: row.updated_at ?? undefined,
    };
}

function locationToRow(location: Location | LocationFormData): Partial<LocationRow> {
    const loc = location as Location;
    const names = loc.Categories ?? [];
    return {
        name: loc.Name ?? '',
        latitude: loc.Latitude ?? 0,
        longitude: loc.Longitude ?? 0,
        description: loc.Description ?? '',
        website: loc.Website ?? '',
        tags: loc.Tags ?? '',
        image: loc.Image ?? '',
        address: loc.Address ?? '',
        phone: loc.Phone ?? '',
        email: loc.Email ?? '',
        instagram: loc.Instagram ?? '',
        facebook: loc.Facebook ?? '',
        additional_links: (loc['Additional Links'] ?? []).map((s) => s.trim()).filter(Boolean),
        category: legacyCategoryCsv(names),
        contact_person: loc['Contact Person'] ?? '',
        last_checked: loc['Last Checked'] ?? '',
        additional_info: loc['Additional Info'] ?? '',
    };
}

export class LocationService {
    private static locations: Location[] = [];
    private static categories: string[] = [];
    private static categoryDefinitions: CategoryDefinition[] = [];
    private static tags: string[] = [];

    static async initialize() {
        console.log('Initializing LocationService (Supabase)...');

        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error(
                'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Please check your .env file.'
            );
        }

        try {
            await Promise.all([
                this.fetchCategories(),
                this.fetchTags(),
            ]);
            await this.fetchLocations();
            console.log('LocationService initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
            throw error;
        }
    }

    private static async logChange(
        source: 'category' | 'tag',
        action: 'ADD' | 'DELETE' | 'RENAME',
        oldValue: string,
        newValue?: string
    ) {
        try {
            const { error } = await supabase.from('change_logs').insert({
                source,
                action,
                old_value: oldValue,
                new_value: newValue ?? '',
            });
            if (error) {
                console.error('Failed to log change:', error);
            }
        } catch (error) {
            console.error('Failed to log change:', error);
        }
    }

    private static async syncLocationCategories(locationId: number, categoryNames: string[]): Promise<void> {
        const unique = dedupePreserveOrder(categoryNames.map((s) => s.trim()).filter(Boolean));
        for (const name of unique) {
            if (!this.categories.includes(name)) {
                await this.addCategory(name);
            }
        }

        const { error: delErr } = await supabase
            .from('location_categories')
            .delete()
            .eq('location_id', locationId);
        if (delErr) {
            throw new Error(`Failed to clear location categories: ${delErr.message}`);
        }

        if (unique.length === 0) {
            const { error: upErr } = await supabase
                .from('locations')
                .update({ category: '', ...locationAuditUpdate() })
                .eq('id', locationId);
            if (upErr) {
                throw new Error(`Failed to update location legacy category: ${upErr.message}`);
            }
            return;
        }

        const { data: catRows, error: catErr } = await supabase
            .from('categories')
            .select('id, name')
            .in('name', unique);
        if (catErr) {
            throw new Error(`Failed to resolve categories: ${catErr.message}`);
        }
        const idByName = new Map((catRows ?? []).map((r: { id: number; name: string }) => [r.name, r.id]));

        const inserts = unique.map((name) => {
            const cid = idByName.get(name);
            if (!cid) {
                throw new Error(`Category not found after insert: ${name}`);
            }
            return { location_id: locationId, category_id: cid };
        });
        const { error: insErr } = await supabase.from('location_categories').insert(inserts);
        if (insErr) {
            throw new Error(`Failed to set location categories: ${insErr.message}`);
        }

        const { error: legErr } = await supabase
            .from('locations')
            .update({ category: legacyCategoryCsv(unique), ...locationAuditUpdate() })
            .eq('id', locationId);
        if (legErr) {
            throw new Error(`Failed to update location legacy category: ${legErr.message}`);
        }
    }

    private static async syncLegacyCategoryColumn(locationId: number): Promise<void> {
        const { data: rows, error } = await supabase
            .from('location_categories')
            .select('created_at, categories(name)')
            .eq('location_id', locationId);
        if (error) {
            throw new Error(`Failed to read location categories: ${error.message}`);
        }
        const sorted = [...(rows ?? [])].sort((a, b) => {
            const ta = (a as { created_at?: string }).created_at
                ? new Date((a as { created_at?: string }).created_at!).getTime()
                : 0;
            const tb = (b as { created_at?: string }).created_at
                ? new Date((b as { created_at?: string }).created_at!).getTime()
                : 0;
            return ta - tb;
        });
        const names = sorted
            .map((r: { categories: { name: string } | null }) => r.categories?.name)
            .filter((n): n is string => Boolean(n?.trim()))
            .map((n) => n.trim());
        const unique = dedupePreserveOrder(names);
        await supabase
            .from('locations')
            .update({ category: legacyCategoryCsv(unique), ...locationAuditUpdate() })
            .eq('id', locationId);
    }

    private static async fetchLocations() {
        try {
            console.log('Fetching locations from Supabase...');
            const embedded = await supabase
                .from('locations')
                .select(
                    `
          *,
          location_categories (
            created_at,
            categories (
              name
            )
          ),
          created_by_user:app_users!created_by(username),
          updated_by_user:app_users!updated_by(username)
        `
                )
                .order('id', { ascending: true });

            if (embedded.error) {
                console.warn(
                    'Embedded category fetch failed; falling back to legacy column:',
                    embedded.error.message
                );
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .order('id', { ascending: true });
                if (error) {
                    throw new Error(`Failed to fetch locations: ${error.message}`);
                }
                this.locations = (data ?? []).map((row: LocationRow) =>
                    rowToLocation({ ...row, location_categories: [] })
                );
            } else {
                this.locations = (embedded.data ?? []).map((row: LocationRowFetched) =>
                    rowToLocation(row)
                );
            }
            console.log('Fetched locations:', this.locations.length);
        } catch (error) {
            console.error('Error fetching locations:', error);
            throw error;
        }
    }

    private static async fetchCategories() {
        try {
            console.log('Fetching categories from Supabase...');
            const { data, error } = await supabase
                .from('categories')
                .select('name, color')
                .order('name', { ascending: true });

            if (error) {
                throw new Error(`Failed to fetch categories: ${error.message}`);
            }

            const defs = (data ?? [])
                .map((r: { name: string; color?: string | null }) => ({
                    name: r.name?.trim(),
                    color: this.normalizeCategoryColor(r.color),
                }))
                .filter((r): r is CategoryDefinition => Boolean(r.name));

            if (defs.length === 0) {
                console.log('No categories found, seeding defaults');
                for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
                    const cat = DEFAULT_CATEGORIES[i];
                    const { error: insertErr } = await supabase
                        .from('categories')
                        .insert({ name: cat, color: this.defaultCategoryColor(i) });
                    if (insertErr && insertErr.code !== '23505') {
                        console.error('Error seeding category:', insertErr);
                    }
                }
                this.categoryDefinitions = DEFAULT_CATEGORIES
                    .map((name, i) => ({ name, color: this.defaultCategoryColor(i) }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                this.categories = this.categoryDefinitions.map((c) => c.name);
                for (const cat of this.categories) {
                    await this.logChange('category', 'ADD', cat);
                }
            } else {
                this.categoryDefinitions = defs.sort((a, b) => a.name.localeCompare(b.name));
                this.categories = this.categoryDefinitions.map((c) => c.name);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            this.categories = [...DEFAULT_CATEGORIES];
            this.categoryDefinitions = DEFAULT_CATEGORIES.map((name, i) => ({
                name,
                color: this.defaultCategoryColor(i),
            }));
        }
    }

    private static async fetchTags() {
        try {
            console.log('Fetching tags from Supabase...');
            const { data, error } = await supabase
                .from('tags')
                .select('name')
                .order('name', { ascending: true });

            if (error) {
                throw new Error(`Failed to fetch tags: ${error.message}`);
            }

            const names = (data ?? []).map((r: { name: string }) => r.name?.trim()).filter(Boolean);

            if (names.length === 0) {
                console.log('No tags found, seeding defaults');
                for (const tag of DEFAULT_TAGS) {
                    const { error: insertErr } = await supabase.from('tags').insert({ name: tag });
                    if (insertErr && insertErr.code !== '23505') {
                        console.error('Error seeding tag:', insertErr);
                    }
                }
                this.tags = [...DEFAULT_TAGS].sort();
                for (const tag of this.tags) {
                    await this.logChange('tag', 'ADD', tag);
                }
            } else {
                this.tags = names.sort();
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            this.tags = [...DEFAULT_TAGS];
        }
    }

    static getAllLocations(): Location[] {
        return this.locations;
    }

    static getLocation(id: string): Location | undefined {
        return this.locations.find((loc) => loc.ID === id);
    }

    static getCategories(): string[] {
        return this.categories;
    }

    static getCategoryDefinitions(): CategoryDefinition[] {
        return [...this.categoryDefinitions];
    }

    static getTags(): string[] {
        return this.tags;
    }

    /** Number of locations using this category */
    static getLocationCountByCategory(category: string): number {
        return this.locations.filter((l) => (l.Categories ?? []).includes(category)).length;
    }

    /** Number of locations using this tag */
    static getLocationCountByTag(tag: string): number {
        return this.locations.filter((l) =>
            (l.Tags ?? '')
                .split(',')
                .map((t) => t.trim())
                .includes(tag)
        ).length;
    }

    static async addCategory(category: string, color?: string): Promise<void> {
        console.log('Adding category:', category);
        if (this.categories.includes(category)) return;

        const normalizedColor = this.normalizeCategoryColor(color);
        const { error } = await supabase.from('categories').insert({ name: category, color: normalizedColor });
        if (error) {
            if (error.code === '23505') {
                this.categories = [...new Set([...this.categories, category])].sort();
                await this.fetchCategories();
                return;
            }
            throw new Error(`Failed to add category: ${error.message}`);
        }

        this.categories.push(category);
        this.categories.sort();
        this.categoryDefinitions = [...this.categoryDefinitions, { name: category, color: normalizedColor }].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
        await this.logChange('category', 'ADD', category);
    }

    static async renameCategory(oldCategory: string, newCategory: string, color?: string): Promise<void> {
        console.log('Renaming category:', oldCategory, 'to', newCategory);

        const updates: { name?: string; color?: string } = {};
        if (oldCategory !== newCategory) {
            updates.name = newCategory;
        }
        if (color) {
            updates.color = this.normalizeCategoryColor(color);
        }
        if (Object.keys(updates).length === 0) {
            return;
        }

        const { error: updateCatError } = await supabase
            .from('categories')
            .update(updates)
            .eq('name', oldCategory);

        if (updateCatError) {
            if (updateCatError.code === '23505' && oldCategory !== newCategory) {
                throw new Error('Category already exists');
            }
            throw new Error(`Failed to rename category: ${updateCatError.message}`);
        }

        const idx = this.categories.indexOf(oldCategory);
        if (idx !== -1) {
            this.categories.splice(idx, 1);
            if (!this.categories.includes(newCategory)) {
                this.categories.push(newCategory);
                this.categories.sort();
            }
        }

        await this.logChange('category', 'RENAME', oldCategory, newCategory);
        await this.refreshData();
    }

    private static normalizeCategoryColor(color?: string | null): string {
        const fallback = '#9B8ACF';
        if (!color) return fallback;
        const normalized = color.trim().toUpperCase();
        if (/^#[0-9A-F]{6}$/.test(normalized)) return normalized;
        return fallback;
    }

    private static defaultCategoryColor(index: number): string {
        const palette = [
            '#EF4444',
            '#F97316',
            '#EAB308',
            '#84CC16',
            '#22C55E',
            '#14B8A6',
            '#06B6D4',
            '#3B82F6',
            '#6366F1',
            '#8B5CF6',
            '#D946EF',
            '#EC4899',
        ];
        return palette[index % palette.length];
    }

    static async deleteCategory(category: string): Promise<void> {
        console.log('Deleting category:', category);

        const { data: catRow, error: catErr } = await supabase
            .from('categories')
            .select('id')
            .eq('name', category)
            .maybeSingle();

        if (catErr) {
            throw new Error(`Failed to look up category: ${catErr.message}`);
        }
        if (!catRow) {
            this.categories = this.categories.filter((c) => c !== category);
            await this.refreshData();
            return;
        }

        const { data: affected, error: affErr } = await supabase
            .from('location_categories')
            .select('location_id')
            .eq('category_id', catRow.id);

        if (affErr) {
            throw new Error(`Failed to list category locations: ${affErr.message}`);
        }

        const { error: delJunctionErr } = await supabase
            .from('location_categories')
            .delete()
            .eq('category_id', catRow.id);

        if (delJunctionErr) {
            throw new Error(`Failed to remove category links: ${delJunctionErr.message}`);
        }

        const { error: deleteError } = await supabase.from('categories').delete().eq('id', catRow.id);

        if (deleteError) {
            throw new Error(`Failed to delete category: ${deleteError.message}`);
        }

        const { error: legacyExactErr } = await supabase
            .from('locations')
            .update({ category: '', ...locationAuditUpdate() })
            .eq('category', category);

        if (legacyExactErr) {
            throw new Error(`Failed to clear legacy category column: ${legacyExactErr.message}`);
        }

        const seen = new Set<number>();
        for (const row of affected ?? []) {
            const lid = row.location_id as number;
            if (seen.has(lid)) continue;
            seen.add(lid);
            await this.syncLegacyCategoryColumn(lid);
        }

        this.categories = this.categories.filter((c) => c !== category);
        await this.logChange('category', 'DELETE', category);
        await this.refreshData();
    }

    static async addTag(tag: string): Promise<void> {
        console.log('Adding tag:', tag);
        if (this.tags.includes(tag)) return;

        const { error } = await supabase.from('tags').insert({ name: tag });
        if (error) {
            if (error.code === '23505') {
                this.tags = [...new Set([...this.tags, tag])].sort();
                return;
            }
            throw new Error(`Failed to add tag: ${error.message}`);
        }

        this.tags.push(tag);
        this.tags = [...new Set(this.tags)].sort();
        await this.logChange('tag', 'ADD', tag);
    }

    static async renameTag(oldTag: string, newTag: string): Promise<void> {
        console.log('Renaming tag:', oldTag, 'to', newTag);

        const locationsToUpdate = this.locations.filter((l) =>
            l.Tags?.split(',')
                .map((t) => t.trim())
                .includes(oldTag)
        );

        for (const loc of locationsToUpdate) {
            const tags = (loc.Tags ?? '')
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            const i = tags.indexOf(oldTag);
            if (i !== -1) {
                tags[i] = newTag;
                const { error } = await supabase
                    .from('locations')
                    .update({ tags: tags.join(', '), ...locationAuditUpdate() })
                    .eq('id', parseInt(loc.ID, 10));

                if (error) {
                    throw new Error(`Failed to update location tags: ${error.message}`);
                }
            }
        }

        const { error: updateTagError } = await supabase
            .from('tags')
            .update({ name: newTag })
            .eq('name', oldTag);

        if (updateTagError && updateTagError.code !== '23505') {
            throw new Error(`Failed to rename tag: ${updateTagError.message}`);
        }

        const tagIdx = this.tags.indexOf(oldTag);
        if (tagIdx !== -1) {
            this.tags.splice(tagIdx, 1);
            if (!this.tags.includes(newTag)) {
                this.tags.push(newTag);
                this.tags.sort();
            }
        }

        for (let i = 0; i < this.locations.length; i++) {
            const tags = (this.locations[i].Tags ?? '').split(',').map((t) => t.trim());
            const j = tags.indexOf(oldTag);
            if (j !== -1) {
                tags[j] = newTag;
                this.locations[i] = { ...this.locations[i], Tags: tags.join(', ') };
            }
        }

        await this.logChange('tag', 'RENAME', oldTag, newTag);
    }

    static async deleteTag(tag: string): Promise<void> {
        console.log('Deleting tag:', tag);

        const locationsToUpdate = this.locations.filter((l) =>
            l.Tags?.split(',')
                .map((t) => t.trim())
                .includes(tag)
        );

        for (const loc of locationsToUpdate) {
            const tags = (loc.Tags ?? '')
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t !== tag);
            const { error } = await supabase
                .from('locations')
                .update({ tags: tags.join(', '), ...locationAuditUpdate() })
                .eq('id', parseInt(loc.ID, 10));

            if (error) {
                throw new Error(`Failed to remove tag from location: ${error.message}`);
            }
        }

        const { error: deleteError } = await supabase.from('tags').delete().eq('name', tag);

        if (deleteError) {
            throw new Error(`Failed to delete tag: ${deleteError.message}`);
        }

        this.tags = this.tags.filter((t) => t !== tag);
        for (let i = 0; i < this.locations.length; i++) {
            const tags = (this.locations[i].Tags ?? '')
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t !== tag);
            this.locations[i] = { ...this.locations[i], Tags: tags.join(', ') };
        }

        await this.logChange('tag', 'DELETE', tag);
        await this.refreshData();
    }

    static async addLocation(location: LocationFormData): Promise<Location> {
        console.log('Adding location:', location);

        const row = { ...locationToRow(location), ...locationAuditInsert() };
        const { data, error } = await supabase.from('locations').insert(row).select('id').single();

        if (error) {
            throw new Error(`Failed to add location: ${error.message}`);
        }

        const id = data.id as number;
        await this.syncLocationCategories(id, location.Categories ?? []);

        const newLocation: Location = {
            ...location,
            ID: String(id),
            Categories: [...new Set((location.Categories ?? []).map((s) => s.trim()).filter(Boolean))].sort(),
        };
        this.locations.push(newLocation);

        return newLocation;
    }

    static async updateLocation(id: string, location: LocationFormData): Promise<Location> {
        console.log('Updating location:', id, location);

        const index = this.locations.findIndex((l) => l.ID === id);
        if (index === -1) throw new Error('Location not found');

        const row = { ...locationToRow(location), ...locationAuditUpdate() };
        const { error } = await supabase.from('locations').update(row).eq('id', parseInt(id, 10));

        if (error) {
            throw new Error(`Failed to update location: ${error.message}`);
        }

        const numId = parseInt(id, 10);
        await this.syncLocationCategories(numId, location.Categories ?? []);

        const updated: Location = {
            ...location,
            ID: id,
            Categories: dedupePreserveOrder((location.Categories ?? []).map((s) => s.trim()).filter(Boolean)),
        };
        this.locations[index] = updated;

        return updated;
    }

    static async deleteLocation(id: string): Promise<void> {
        console.log('Deleting location:', id);

        const { error } = await supabase.from('locations').delete().eq('id', parseInt(id, 10));

        if (error) {
            throw new Error(`Failed to delete location: ${error.message}`);
        }

        this.locations = this.locations.filter((l) => l.ID !== id);
    }

    static async refreshData(): Promise<void> {
        await Promise.all([
            this.fetchLocations(),
            this.fetchCategories(),
            this.fetchTags(),
        ]);
    }
}
