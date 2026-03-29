import React, { useState, useEffect, useMemo } from 'react';
import { PencilIcon, PlusIcon, XMarkIcon, TagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { LocationService } from '../services/LocationService';

const cardBase =
    'bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/10';

export default function TagsPage() {
    const [tags, setTags] = useState<string[]>([]);
    const [modal, setModal] = useState<'add' | 'edit' | null>(null);
    const [value, setValue] = useState('');
    const [editing, setEditing] = useState({ old: '', new: '' });
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadTags = () => setTags([...new Set(LocationService.getTags())].sort());
    useEffect(() => {
        loadTags();
    }, []);

    const handleAdd = async () => {
        if (!value.trim()) {
            setError('Name required');
            return;
        }
        if (tags.includes(value)) {
            setError('Already exists');
            return;
        }
        try {
            await LocationService.addTag(value);
            loadTags();
            setValue('');
            setModal(null);
            setError(null);
        } catch {
            setError('Failed to add');
        }
    };

    const handleEdit = async () => {
        if (!editing.new.trim()) {
            setError('Name required');
            return;
        }
        if (tags.includes(editing.new) && editing.new !== editing.old) {
            setError('Already exists');
            return;
        }
        try {
            await LocationService.renameTag(editing.old, editing.new);
            loadTags();
            setModal(null);
            setError(null);
        } catch {
            setError('Failed to edit');
        }
    };

    const handleDelete = async (tag: string) => {
        const count = LocationService.getLocationCountByTag(tag);
        const msg =
            count > 0
                ? `"${tag}" is used by ${count} location(s). Remove from all and delete?`
                : `Delete "${tag}"?`;
        if (window.confirm(msg)) {
            try {
                await LocationService.deleteTag(tag);
                loadTags();
                setError(null);
            } catch {
                setError('Failed to delete');
            }
        }
    };

    const openAdd = () => {
        setValue('');
        setEditing({ old: '', new: '' });
        setError(null);
        setModal('add');
    };
    const openEdit = (t: string) => {
        setEditing({ old: t, new: t });
        setValue('');
        setError(null);
        setModal('edit');
    };

    const inputClass =
        'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF]';
    const searchInputClass =
        'w-full h-10 pl-8 pr-3 text-sm rounded-xl border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF] box-border';

    const filteredTags = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return tags;
        return tags.filter((t) => t.toLowerCase().includes(q));
    }, [tags, searchQuery]);

    const isSearching = searchQuery.trim().length > 0;

    return (
        <div className="flex flex-col h-full gap-3 min-h-0">
            <div className={`${cardBase} p-3 sm:p-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
                    <div className="flex items-start gap-3 min-w-0 shrink-0">
                        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#9B8ACF]/10 text-[#9B8ACF]">
                            <TagIcon className="w-5 h-5" aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-800">Tags</h1>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {tags.length} {tags.length === 1 ? 'tag' : 'tags'} · used on locations
                                {isSearching && tags.length > 0 && (
                                    <span className="text-gray-400">
                                        {' '}
                                        · {filteredTags.length} match{filteredTags.length === 1 ? '' : 'es'}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto shrink-0 min-w-0">
                        <div className="relative flex-none w-[10rem] sm:w-[11rem]">
                            <MagnifyingGlassIcon
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                aria-hidden
                            />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search…"
                                className={searchInputClass}
                                aria-label="Search tags"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={openAdd}
                            className="inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium rounded-xl bg-[#9B8ACF] hover:bg-[#7B6CB8] text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors shrink-0"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add tag
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="px-3 py-2 text-sm bg-red-50 border border-red-200 rounded-lg text-red-800 shrink-0">
                    {error}
                </div>
            )}

            <div className={`flex-1 min-h-0 flex flex-col ${cardBase} overflow-hidden`}>
                <div className="shrink-0 px-4 py-2.5 border-b border-gray-200/80 bg-gray-50/95 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">All tags</span>
                    {tags.length > 0 && isSearching && (
                        <span className="text-[11px] text-gray-500 tabular-nums">
                            Showing {filteredTags.length} of {tags.length}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-5">
                    {tags.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">No tags yet. Add one to get started.</div>
                    ) : filteredTags.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">
                            No tags match &ldquo;{searchQuery.trim()}&rdquo;. Try a different search.
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {filteredTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 max-w-full pl-3 pr-1 py-1.5 rounded-full border border-[#9B8ACF]/35 bg-[#9B8ACF]/10 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => openEdit(tag)}
                                        className="text-sm font-medium truncate min-w-0 hover:text-[#7B6CB8] text-left"
                                    >
                                        {tag}
                                    </button>
                                    <span className="w-px h-4 bg-[#9B8ACF]/25 shrink-0" aria-hidden />
                                    <button
                                        type="button"
                                        onClick={() => openEdit(tag)}
                                        className="p-1 rounded-full text-gray-500 hover:text-[#9B8ACF] hover:bg-white/60"
                                        aria-label={`Edit ${tag}`}
                                    >
                                        <PencilIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(tag)}
                                        className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 mr-0.5"
                                        aria-label={`Remove ${tag}`}
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setModal(null)}
                    role="presentation"
                >
                    <div
                        className="bg-white border border-black/10 rounded-2xl w-full max-w-md shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5 sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tag-modal-title"
                    >
                        <h2 id="tag-modal-title" className="text-sm font-semibold text-gray-800 mb-1">
                            {modal === 'add' ? 'Add tag' : 'Edit tag'}
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">
                            {modal === 'add' ? 'Create a tag for filtering locations.' : 'Rename this tag.'}
                        </p>
                        <input
                            type="text"
                            value={modal === 'add' ? value : editing.new}
                            onChange={(e) =>
                                modal === 'add' ? setValue(e.target.value) : setEditing({ ...editing, new: e.target.value })
                            }
                            placeholder="Tag name"
                            className={inputClass}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className="px-4 py-2 text-sm font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={modal === 'add' ? handleAdd : handleEdit}
                                className="px-4 py-2 text-sm font-medium rounded-full bg-[#9B8ACF] hover:bg-[#7B6CB8] text-gray-900 transition-colors"
                            >
                                {modal === 'add' ? 'Add' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
