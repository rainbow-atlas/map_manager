import { supabase } from '../lib/supabase';

export interface User {
    /** `app_users.id` — used for location audit (`created_by` / `updated_by`). */
    id: string;
    username: string;
    role: 'admin' | 'editor';
}

type AuthStateListener = (user: User | null) => void;
let authListeners: AuthStateListener[] = [];
let cachedUser: User | null = null;

function normalizeRole(role: string): User['role'] {
    if (role === 'viewer' || role === 'guest') return 'editor';
    if (role === 'admin' || role === 'editor') return role;
    return 'editor';
}

function setCachedUser(user: User | null) {
    cachedUser = user;
    try {
        if (user) {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('map_manager_user', JSON.stringify(user));
            }
        } else {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem('map_manager_user');
            }
        }
    } catch {
        // ignore storage errors
    }
    authListeners.forEach((fn) => fn(user));
}

async function hashPassword(username: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    // Stable scheme shared with scripts: username:password:map-manager-v1
    const data = encoder.encode(`${username}:${password}:map-manager-v1`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export class AuthService {
    /** Initialize from localStorage on app start. */
    static init() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return;
            const raw = window.localStorage.getItem('map_manager_user');
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<User> & { role?: string };
            if (parsed?.id && parsed.username && parsed.role) {
                const role = normalizeRole(parsed.role);
                setCachedUser({ id: parsed.id, username: parsed.username, role });
            }
        } catch {
            // ignore parse/storage errors
        }
    }

    static async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, password_hash, role')
            .eq('username', username)
            .single();

        if (error || !data) {
            return { success: false, error: 'Invalid username or password' };
        }

        const expectedHash = data.password_hash as string;
        const actualHash = await hashPassword(username, password);
        if (expectedHash !== actualHash) {
            return { success: false, error: 'Invalid username or password' };
        }

        const role = normalizeRole(String(data.role));
        const id = data.id as string;
        setCachedUser({ id, username, role });
        return { success: true };
    }

    static async logout(): Promise<void> {
        setCachedUser(null);
    }

    static getCurrentUser(): User | null {
        return cachedUser;
    }

    /** Async hook reserved for future use; use `getCurrentUser()` (restores from localStorage in `init`). */
    static async getSessionUser(): Promise<User | null> {
        return null;
    }

    static isAuthenticated(): boolean {
        return !!cachedUser;
    }

    /** Subscribe to auth state changes. Returns unsubscribe fn. */
    static onAuthStateChange(callback: AuthStateListener): () => void {
        authListeners.push(callback);
        return () => {
            authListeners = authListeners.filter((fn) => fn !== callback);
        };
    }

    static hasPermission(requiredRole: 'admin' | 'editor'): boolean {
        const user = this.getCurrentUser();
        if (!user) return false;

        const roles = {
            admin: 2,
            editor: 1,
        };
        return roles[user.role] >= roles[requiredRole];
    }

    /** Keep local session in sync after `app_users` row changes for the logged-in account. */
    static applyUserProfileFromServer(userId: string, next: Pick<User, 'username' | 'role'>): void {
        const u = cachedUser;
        if (!u || u.id !== userId) return;
        setCachedUser({ ...u, ...next });
    }
}
