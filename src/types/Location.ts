export interface Location {
    ID: string;
    Name: string;
    Latitude: number;
    Longitude: number;
    Description: string;
    Website: string;
    Tags: string;
    Image: string;
    Address: string;
    Phone: string;
    Email: string;
    Instagram: string;
    Facebook: string;
    'Additional Links': string[];
    /**
     * Category names (many-to-many via `location_categories` in Supabase).
     * Order matters: `Categories[0]` is the primary (main) category for display and exports.
     */
    Categories: string[];
    'Contact Person': string;
    'Last Checked': string;
    'Additional Info': string;
    /** Read-only: `app_users.username` for `locations.created_by`. */
    createdByUsername?: string;
    /** Read-only: `app_users.username` for `locations.updated_by`. */
    lastEditedByUsername?: string;
    /** Read-only: ISO timestamp from `locations.updated_at`. */
    recordUpdatedAt?: string;
}

export type LocationFormData = Omit<Location, 'ID'>;
