import { supabase } from '../lib/supabase';
import type { User } from './AuthService';

export type AppUserRow = {
    id: string;
    username: string;
    role: User['role'];
    created_at: string | null;
};

export class AppUsersAdminService {
    static async listUsers(): Promise<AppUserRow[]> {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, username, role, created_at')
            .order('username', { ascending: true });

        if (error) throw new Error(error.message);
        return (data ?? []) as AppUserRow[];
    }

    /**
     * Creates a user via RPC (verifies admin username/password server-side).
     * Caller must supply the current admin password; it is not stored after login.
     */
    static async createUser(params: {
        adminUsername: string;
        adminPassword: string;
        newUsername: string;
        newPassword: string;
        newRole: User['role'];
    }): Promise<AppUserRow> {
        const { adminUsername, adminPassword, newUsername, newPassword, newRole } = params;

        const { data, error } = await supabase.rpc('create_app_user_admin', {
            p_admin_username: adminUsername,
            p_admin_password: adminPassword,
            p_new_username: newUsername.trim(),
            p_new_password: newPassword,
            p_new_role: newRole,
        });

        if (error) {
            const msg = error.message || 'Failed to create user';
            if (msg.includes('username already exists')) throw new Error('That username is already taken.');
            if (msg.includes('invalid credentials') || msg.includes('forbidden')) {
                throw new Error('Admin verification failed. Check your password.');
            }
            throw new Error(msg);
        }

        return data as AppUserRow;
    }

    static async updateUser(params: {
        adminUsername: string;
        adminPassword: string;
        targetUserId: string;
        newUsername: string;
        newRole: User['role'];
        /** Empty = keep password (unless username changes; server enforces). */
        newPassword: string;
    }): Promise<AppUserRow> {
        const { adminUsername, adminPassword, targetUserId, newUsername, newRole, newPassword } = params;

        const { data, error } = await supabase.rpc('update_app_user_admin', {
            p_admin_username: adminUsername,
            p_admin_password: adminPassword,
            p_target_user_id: targetUserId,
            p_new_username: newUsername.trim(),
            p_new_role: newRole,
            p_new_password: newPassword,
        });

        if (error) {
            const msg = error.message || 'Failed to update user';
            if (msg.includes('username already exists')) throw new Error('That username is already taken.');
            if (msg.includes('password required when changing username')) {
                throw new Error(
                    'When changing the username, set a new password (login hashes include the username).'
                );
            }
            if (msg.includes('invalid credentials') || msg.includes('forbidden')) {
                throw new Error('Admin verification failed. Check your password.');
            }
            if (msg.includes('user not found')) throw new Error('User not found.');
            throw new Error(msg);
        }

        return data as AppUserRow;
    }

    static async deleteUser(params: {
        adminUsername: string;
        adminPassword: string;
        targetUserId: string;
    }): Promise<void> {
        const { adminUsername, adminPassword, targetUserId } = params;

        const { error } = await supabase.rpc('delete_app_user_admin', {
            p_admin_username: adminUsername,
            p_admin_password: adminPassword,
            p_target_user_id: targetUserId,
        });

        if (error) {
            const msg = error.message || 'Failed to delete user';
            if (msg.includes('cannot delete own account')) {
                throw new Error('You cannot delete your own account.');
            }
            if (msg.includes('invalid credentials') || msg.includes('forbidden')) {
                throw new Error('Admin verification failed. Check your password.');
            }
            if (msg.includes('user not found')) throw new Error('User not found.');
            throw new Error(msg);
        }
    }
}
