import type { Location } from '../types/Location';

const DRAFT_VERSION = 1 as const;

export interface LocationFormSessionDraft {
    version: typeof DRAFT_VERSION;
    formData: Partial<Location>;
    addressInput: string;
    addressVerified: boolean;
    selectedTags: string[];
}

export function loadLocationFormDraft(key: string): LocationFormSessionDraft | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<LocationFormSessionDraft>;
        if (parsed.version !== DRAFT_VERSION || !parsed.formData || typeof parsed.formData !== 'object') {
            return null;
        }
        return {
            version: DRAFT_VERSION,
            formData: parsed.formData,
            addressInput: typeof parsed.addressInput === 'string' ? parsed.addressInput : '',
            addressVerified: Boolean(parsed.addressVerified),
            selectedTags: Array.isArray(parsed.selectedTags)
                ? parsed.selectedTags.filter((t): t is string => typeof t === 'string')
                : [],
        };
    } catch {
        return null;
    }
}

export function saveLocationFormDraft(key: string, draft: Omit<LocationFormSessionDraft, 'version'>): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        const payload: LocationFormSessionDraft = { ...draft, version: DRAFT_VERSION };
        sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
        // quota / private mode
    }
}

export function clearLocationFormDraft(key: string): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(key);
    } catch {
        /* ignore */
    }
}
