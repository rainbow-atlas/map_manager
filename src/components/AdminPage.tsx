import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
    UserGroupIcon,
    PlusIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { AuthService, type User } from '../services/AuthService';
import { AppUsersAdminService, type AppUserRow } from '../services/AppUsersAdminService';

const cardBase =
    'bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/10';

const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF]';

const searchInputClass =
    'w-full h-10 pl-8 pr-3 text-sm rounded-xl border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF] box-border';

const ROLES: User['role'][] = ['admin', 'editor'];

type RoleFilter = 'all' | User['role'];

function PasswordFieldRow({
    label,
    value,
    onChange,
    autoComplete,
    placeholder,
    inputClassName,
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete?: string;
    placeholder?: string;
    inputClassName: string;
    hint?: React.ReactNode;
}) {
    const [visible, setVisible] = useState(false);
    return (
        <label className="block w-full">
            <span className="text-[11px] font-medium text-gray-600">{label}</span>
            <div className="relative mt-1">
                <input
                    type={visible ? 'text' : 'password'}
                    className={`${inputClassName} pr-10`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                >
                    {visible ? (
                        <EyeSlashIcon className="w-4 h-4" aria-hidden />
                    ) : (
                        <EyeIcon className="w-4 h-4" aria-hidden />
                    )}
                </button>
            </div>
            {hint}
        </label>
    );
}

export default function AdminPage() {
    const me = AuthService.getCurrentUser();
    const [users, setUsers] = useState<AppUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

    const [addOpen, setAddOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<User['role']>('editor');
    const [addAdminPassword, setAddAdminPassword] = useState('');

    const [editUser, setEditUser] = useState<AppUserRow | null>(null);
    const [editUsername, setEditUsername] = useState('');
    const [editRole, setEditRole] = useState<User['role']>('editor');
    const [editNewPassword, setEditNewPassword] = useState('');
    const [editAdminPassword, setEditAdminPassword] = useState('');

    const [deleteTarget, setDeleteTarget] = useState<AppUserRow | null>(null);
    const [deleteAdminPassword, setDeleteAdminPassword] = useState('');

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const rows = await AppUsersAdminService.listUsers();
            setUsers(rows);
        } catch (e) {
            setLoadError(e instanceof Error ? e.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (me?.role === 'admin') load();
    }, [me?.role, load]);

    const filteredUsers = useMemo(() => {
        let list = users;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((u) => u.username.toLowerCase().includes(q));
        }
        if (roleFilter !== 'all') {
            list = list.filter((u) => u.role === roleFilter);
        }
        return list;
    }, [users, searchQuery, roleFilter]);

    const isSearchingOrFiltering =
        searchQuery.trim().length > 0 || roleFilter !== 'all';

    if (!me || me.role !== 'admin') {
        return <Navigate to="/home" replace />;
    }

    const openAdd = () => {
        setEditUser(null);
        setDeleteTarget(null);
        setNewUsername('');
        setNewPassword('');
        setNewRole('editor');
        setAddAdminPassword('');
        setSubmitError(null);
        setAddOpen(true);
    };

    const openEdit = (u: AppUserRow) => {
        setAddOpen(false);
        setDeleteTarget(null);
        setEditUser(u);
        setEditUsername(u.username);
        setEditRole(u.role);
        setEditNewPassword('');
        setEditAdminPassword('');
        setSubmitError(null);
    };

    const openDelete = (u: AppUserRow) => {
        setAddOpen(false);
        setEditUser(null);
        setDeleteTarget(u);
        setDeleteAdminPassword('');
        setSubmitError(null);
    };

    const handleCreate = async () => {
        if (!newUsername.trim() || !newPassword.trim()) {
            setSubmitError('Username and password are required.');
            return;
        }
        if (!addAdminPassword.trim()) {
            setSubmitError('Enter your admin password to confirm.');
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            await AppUsersAdminService.createUser({
                adminUsername: me.username,
                adminPassword: addAdminPassword,
                newUsername: newUsername.trim(),
                newPassword,
                newRole,
            });
            setAddOpen(false);
            await load();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editUser) return;
        const trimmed = editUsername.trim();
        if (!trimmed) {
            setSubmitError('Username is required.');
            return;
        }
        if (trimmed !== editUser.username && !editNewPassword.trim()) {
            setSubmitError(
                'When changing the username, set a new password (stored login hash includes the username).'
            );
            return;
        }
        if (!editAdminPassword.trim()) {
            setSubmitError('Enter your admin password to confirm.');
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            const row = await AppUsersAdminService.updateUser({
                adminUsername: me.username,
                adminPassword: editAdminPassword,
                targetUserId: editUser.id,
                newUsername: trimmed,
                newRole: editRole,
                newPassword: editNewPassword,
            });
            AuthService.applyUserProfileFromServer(row.id, {
                username: row.username,
                role: row.role,
            });
            setEditUser(null);
            await load();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to update user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        if (!deleteAdminPassword.trim()) {
            setSubmitError('Enter your admin password to confirm.');
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            await AppUsersAdminService.deleteUser({
                adminUsername: me.username,
                adminPassword: deleteAdminPassword,
                targetUserId: deleteTarget.id,
            });
            setDeleteTarget(null);
            await load();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to delete user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-3 min-h-0">
            <div className={`${cardBase} p-3 sm:p-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
                    <div className="flex items-start gap-3 min-w-0 shrink-0">
                        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#9B8ACF]/10 text-[#9B8ACF]">
                            <UserGroupIcon className="w-5 h-5" aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-800">Admin</h1>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {users.length} {users.length === 1 ? 'user' : 'users'}
                                {isSearchingOrFiltering && users.length > 0 && (
                                    <span className="text-gray-400">
                                        {' '}
                                        · {filteredUsers.length} shown
                                    </span>
                                )}
                                {' · '}
                                map manager login accounts
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openAdd}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl bg-[#9B8ACF] text-white hover:bg-[#8a79b8] shrink-0 shadow-[0_2px_8px_rgba(155,138,207,0.35)]"
                    >
                        <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
                        Add user
                    </button>
                </div>
            </div>

            <div className={`${cardBase} flex-1 min-h-0 flex flex-col overflow-hidden`}>
                {!loading && !loadError && (
                    <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center p-3 border-b border-gray-100 bg-gray-50/50 gap-2">
                        <div className="relative flex-1 min-w-0 max-w-md">
                            <MagnifyingGlassIcon
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                aria-hidden
                            />
                            <input
                                type="search"
                                className={searchInputClass}
                                placeholder="Search by username…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search users"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <label className="text-[11px] text-gray-500 whitespace-nowrap" htmlFor="admin-role-filter">
                                Role
                            </label>
                            <select
                                id="admin-role-filter"
                                className={`${inputClass} py-2 h-10 w-[min(100%,11rem)]`}
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                            >
                                <option value="all">All roles</option>
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {loadError && (
                    <div className="p-4 text-sm text-red-600 border-b border-red-100 bg-red-50/50">{loadError}</div>
                )}
                {loading ? (
                    <div className="p-8 text-center text-sm text-gray-500">Loading users…</div>
                ) : (
                    <div className="overflow-auto flex-1 min-h-0">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-gray-50/95 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-500 z-[1]">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Username</th>
                                    <th className="px-4 py-2.5 font-medium">Role</th>
                                    <th className="px-4 py-2.5 font-medium">Created</th>
                                    <th className="px-4 py-2.5 font-medium w-28 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/80">
                                        <td className="px-4 py-2.5 text-gray-900 font-medium">{u.username}</td>
                                        <td className="px-4 py-2.5 text-gray-600 capitalize">{u.role}</td>
                                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                                            {u.created_at
                                                ? new Date(u.created_at).toLocaleString(undefined, {
                                                      dateStyle: 'medium',
                                                      timeStyle: 'short',
                                                  })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="inline-flex items-center justify-end gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(u)}
                                                    className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:bg-[#9B8ACF]/15 hover:text-[#7B6CB8]"
                                                    title="Edit user"
                                                    aria-label={`Edit ${u.username}`}
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDelete(u)}
                                                    disabled={u.id === me.id}
                                                    className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
                                                    title={
                                                        u.id === me.id
                                                            ? 'You cannot delete your own account'
                                                            : 'Delete user'
                                                    }
                                                    aria-label={`Delete ${u.username}`}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && !loadError && (
                            <div className="p-8 text-center text-sm text-gray-500">No users yet.</div>
                        )}
                        {users.length > 0 && filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-sm text-gray-500">
                                No users match your search or filter.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {addOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-add-user-title"
                >
                    <div className={`${cardBase} w-full max-w-md p-4 shadow-lg`}>
                        <div className="flex items-start justify-between gap-2 mb-4">
                            <h2 id="admin-add-user-title" className="text-sm font-semibold text-gray-800">
                                Add user
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setAddOpen(false);
                                    setSubmitError(null);
                                }}
                                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="block">
                                <span className="text-[11px] font-medium text-gray-600">Username</span>
                                <input
                                    className={`${inputClass} mt-1`}
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </label>
                            <PasswordFieldRow
                                label="Password"
                                value={newPassword}
                                onChange={setNewPassword}
                                autoComplete="new-password"
                                inputClassName={inputClass}
                            />
                            <label className="block">
                                <span className="text-[11px] font-medium text-gray-600">Role</span>
                                <select
                                    className={`${inputClass} mt-1`}
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as User['role'])}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <PasswordFieldRow
                                label="Your password (confirm)"
                                value={addAdminPassword}
                                onChange={setAddAdminPassword}
                                autoComplete="current-password"
                                placeholder="Re-enter your admin password"
                                inputClassName={inputClass}
                                hint={
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Required to verify this action; your password is not stored in the browser.
                                    </p>
                                }
                            />
                            {submitError && addOpen && (
                                <p className="text-xs text-red-600" role="alert">
                                    {submitError}
                                </p>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddOpen(false);
                                        setSubmitError(null);
                                    }}
                                    className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={submitting}
                                    className="px-3 py-2 text-xs font-medium rounded-lg bg-[#9B8ACF] text-white hover:bg-[#8a79b8] disabled:opacity-50"
                                >
                                    {submitting ? 'Creating…' : 'Create user'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-edit-user-title"
                >
                    <div className={`${cardBase} w-full max-w-md p-4 shadow-lg max-h-[min(90vh,32rem)] overflow-y-auto`}>
                        <div className="flex items-start justify-between gap-2 mb-4">
                            <h2 id="admin-edit-user-title" className="text-sm font-semibold text-gray-800">
                                Edit user
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditUser(null);
                                    setSubmitError(null);
                                }}
                                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                Passwords are stored as a hash; the current password cannot be shown. Leave
                                &quot;New password&quot; blank to keep the existing password (unless you change the
                                username — then a new password is required).
                            </p>
                            <label className="block">
                                <span className="text-[11px] font-medium text-gray-600">Username</span>
                                <input
                                    className={`${inputClass} mt-1`}
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[11px] font-medium text-gray-600">Role</span>
                                <select
                                    className={`${inputClass} mt-1`}
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value as User['role'])}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <PasswordFieldRow
                                label="New password (optional)"
                                value={editNewPassword}
                                onChange={setEditNewPassword}
                                autoComplete="new-password"
                                placeholder="Leave blank to keep current"
                                inputClassName={inputClass}
                            />
                            <PasswordFieldRow
                                label="Your password (confirm)"
                                value={editAdminPassword}
                                onChange={setEditAdminPassword}
                                autoComplete="current-password"
                                placeholder="Your admin password"
                                inputClassName={inputClass}
                            />
                            {submitError && editUser && (
                                <p className="text-xs text-red-600" role="alert">
                                    {submitError}
                                </p>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditUser(null);
                                        setSubmitError(null);
                                    }}
                                    className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdate}
                                    disabled={submitting}
                                    className="px-3 py-2 text-xs font-medium rounded-lg bg-[#9B8ACF] text-white hover:bg-[#8a79b8] disabled:opacity-50"
                                >
                                    {submitting ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-delete-user-title"
                >
                    <div className={`${cardBase} w-full max-w-md p-4 shadow-lg`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <h2 id="admin-delete-user-title" className="text-sm font-semibold text-gray-800">
                                Delete user
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteTarget(null);
                                    setDeleteAdminPassword('');
                                    setSubmitError(null);
                                }}
                                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-[13px] text-gray-600 mb-4">
                            Permanently delete <span className="font-medium text-gray-900">{deleteTarget.username}</span>
                            ? This cannot be undone.
                        </p>
                        <PasswordFieldRow
                            label="Your password (confirm)"
                            value={deleteAdminPassword}
                            onChange={setDeleteAdminPassword}
                            autoComplete="current-password"
                            placeholder="Your admin password"
                            inputClassName={inputClass}
                        />
                        {submitError && deleteTarget && (
                            <p className="text-xs text-red-600 mt-3" role="alert">
                                {submitError}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 mt-4 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteTarget(null);
                                    setDeleteAdminPassword('');
                                    setSubmitError(null);
                                }}
                                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={submitting}
                                className="px-3 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {submitting ? 'Deleting…' : 'Delete user'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
