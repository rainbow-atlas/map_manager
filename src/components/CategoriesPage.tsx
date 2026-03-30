import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { CategoryDefinition, LocationService } from '../services/LocationService';

const cardBase =
    'bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/10';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryDefinition[]>([]);
    const [modal, setModal] = useState<'add' | 'edit' | null>(null);
    const [value, setValue] = useState('');
    const [colorValue, setColorValue] = useState('#9B8ACF');
    const [editing, setEditing] = useState({ old: '', new: '', color: '#9B8ACF' });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);
    const loadCategories = () => setCategories(LocationService.getCategoryDefinitions());

    const handleAdd = async () => {
        if (!value.trim()) {
            setError('Name required');
            return;
        }
        if (categories.some((c) => c.name === value)) {
            setError('Already exists');
            return;
        }
        try {
            await LocationService.addCategory(value, colorValue);
            loadCategories();
            setValue('');
            setColorValue('#9B8ACF');
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
        if (categories.some((c) => c.name === editing.new) && editing.new !== editing.old) {
            setError('Already exists');
            return;
        }
        try {
            await LocationService.renameCategory(editing.old, editing.new, editing.color);
            loadCategories();
            setModal(null);
            setError(null);
        } catch {
            setError('Failed to edit');
        }
    };

    const handleDelete = async (categoryName: string) => {
        const count = LocationService.getLocationCountByCategory(categoryName);
        const msg =
            count > 0
                ? `"${categoryName}" is used by ${count} location(s). Remove from all and delete?`
                : `Delete "${categoryName}"?`;
        if (window.confirm(msg)) {
            try {
                await LocationService.deleteCategory(categoryName);
                loadCategories();
                setError(null);
            } catch {
                setError('Failed to delete');
            }
        }
    };

    const openAdd = () => {
        setValue('');
        setColorValue('#9B8ACF');
        setEditing({ old: '', new: '', color: '#9B8ACF' });
        setError(null);
        setModal('add');
    };
    const openEdit = (c: CategoryDefinition) => {
        setEditing({ old: c.name, new: c.name, color: c.color });
        setValue('');
        setError(null);
        setModal('edit');
    };

    const inputClass =
        'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF]';

    return (
        <div className="flex flex-col h-full gap-3 min-h-0">
            <div className={`${cardBase} p-3 sm:p-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#9B8ACF]/10 text-[#9B8ACF]">
                            <ChartBarIcon className="w-5 h-5" aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-800">Categories</h1>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openAdd}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#9B8ACF] hover:bg-[#7B6CB8] text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors shrink-0"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add category
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-3 py-2 text-sm bg-red-50 border border-red-200 rounded-lg text-red-800 shrink-0">
                    {error}
                </div>
            )}

            <div className={`flex-1 min-h-0 flex flex-col ${cardBase} overflow-hidden`}>
                <div className="shrink-0 px-4 py-2.5 border-b border-gray-200/80 bg-gray-50/95">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Name & color</span>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                    {categories.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-gray-500">No categories yet. Add one to get started.</div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {categories.map((category) => {
                                const locationCount = LocationService.getLocationCountByCategory(category.name);
                                return (
                                <li
                                    key={category.name}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-[#9B8ACF]/[0.06] transition-colors"
                                >
                                    <div className="grid grid-cols-[20px_minmax(0,1fr)_110px] items-center gap-x-4 min-w-0">
                                        <span
                                            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                                            style={{ backgroundColor: category.color }}
                                            aria-hidden
                                        />
                                        <span className="text-sm font-medium text-gray-900 truncate">{category.name}</span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap text-right">
                                            {locationCount} {locationCount === 1 ? 'location' : 'locations'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(category)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#9B8ACF] hover:bg-[#9B8ACF]/10"
                                            aria-label={`Edit ${category.name}`}
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(category.name)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                                            aria-label={`Delete ${category.name}`}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
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
                        aria-labelledby="category-modal-title"
                    >
                        <h2 id="category-modal-title" className="text-sm font-semibold text-gray-800 mb-1">
                            {modal === 'add' ? 'Add category' : 'Edit category'}
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">
                            {modal === 'add' ? 'Create a new category for locations.' : 'Rename this category.'}
                        </p>
                        <input
                            type="text"
                            value={modal === 'add' ? value : editing.new}
                            onChange={(e) =>
                                modal === 'add' ? setValue(e.target.value) : setEditing({ ...editing, new: e.target.value })
                            }
                            placeholder="Category name"
                            className={inputClass}
                            autoFocus
                        />
                        <div className="mt-3">
                            <label className="block text-xs text-gray-500 mb-1">Fixed color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={modal === 'add' ? colorValue : editing.color}
                                    onChange={(e) =>
                                        modal === 'add'
                                            ? setColorValue(e.target.value.toUpperCase())
                                            : setEditing({ ...editing, color: e.target.value.toUpperCase() })
                                    }
                                    className="h-10 w-14 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer"
                                />
                                <span className="text-xs text-gray-600 font-medium uppercase">
                                    {modal === 'add' ? colorValue : editing.color}
                                </span>
                            </div>
                        </div>
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
