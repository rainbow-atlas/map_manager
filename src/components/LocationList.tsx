import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    ArrowPathIcon,
    PencilIcon,
    TrashIcon,
    LinkIcon,
    MapPinIcon,
    ArrowsUpDownIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import { Location } from '../types/Location';
import { LocationService } from '../services/LocationService';
import LocationForm from './LocationForm';
import { ThemeProvider, createTheme, CssBaseline, Dialog } from '@mui/material';

interface FilterState {
    search: string;
    category: string;
    tags: string[];
    lastCheckedDays: number;
}

const muiTheme = createTheme({
    palette: { primary: { main: '#9B8ACF' }, secondary: { main: '#FFB5DA' } },
    shape: { borderRadius: 2 },
});

const cardBase =
    'bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/10';

type SortOption = 'name-asc' | 'name-desc' | 'lastChecked-desc' | 'lastChecked-asc' | 'address-asc' | 'address-desc';

/** Same rule as HomePage "Needs update": last checked more than 90 days ago. */
function locationNeedsUpdate(loc: Location): boolean {
    const lastChecked = new Date(loc['Last Checked']);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return lastChecked < ninetyDaysAgo;
}

function sortLocations(list: Location[], sortOption: SortOption): Location[] {
    const out = [...list];
    const strCmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    const time = (loc: Location) => new Date(loc['Last Checked']).getTime();
    switch (sortOption) {
        case 'name-asc':
            out.sort((a, b) => strCmp(a.Name || '', b.Name || ''));
            break;
        case 'name-desc':
            out.sort((a, b) => strCmp(b.Name || '', a.Name || ''));
            break;
        case 'lastChecked-asc':
            out.sort((a, b) => time(a) - time(b));
            break;
        case 'lastChecked-desc':
            out.sort((a, b) => time(b) - time(a));
            break;
        case 'address-asc':
            out.sort((a, b) => strCmp(a.Address || '', b.Address || ''));
            break;
        case 'address-desc':
            out.sort((a, b) => strCmp(b.Address || '', a.Address || ''));
            break;
        default:
            break;
    }
    return out;
}

export default function LocationList() {
    const [searchParams] = useSearchParams();
    const [locations, setLocations] = useState<Location[]>([]);
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        category: '',
        tags: [],
        lastCheckedDays: 0,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [editLocation, setEditLocation] = useState<Location | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [sortOption, setSortOption] = useState<SortOption>('name-asc');

    const loadLocations = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await LocationService.refreshData();
            setLocations(LocationService.getAllLocations());
            setAvailableTags(LocationService.getTags());
            setCategories(LocationService.getCategories());
        } catch (e) {
            setError('Failed to load locations.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLocations();
    }, []);

    useEffect(() => {
        const stale = searchParams.get('stale');
        if (stale === '90' || searchParams.get('needsUpdate') === '1') {
            setFilters((f) => ({ ...f, lastCheckedDays: 90 }));
            setShowFilters(true);
        }
    }, [searchParams]);

    useEffect(() => {
        let filtered = [...locations];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            filtered = filtered.filter((l) => {
                const parts: string[] = [];
                for (const v of Object.values(l)) {
                    if (Array.isArray(v)) {
                        parts.push(...v.map((x) => String(x ?? '')));
                    } else {
                        parts.push(String(v ?? ''));
                    }
                }
                return parts.some((s) => s.toLowerCase().includes(q));
            });
        }
        if (filters.category) {
            filtered = filtered.filter((l) => (l.Categories ?? []).includes(filters.category));
        }
        if (filters.tags.length) {
            filtered = filtered.filter((l) => {
                const ts = (l.Tags ?? '').split(',').map((t) => t.trim());
                return filters.tags.every((t) => ts.includes(t));
            });
        }
        if (filters.lastCheckedDays > 0) {
            const cut = new Date();
            cut.setDate(cut.getDate() - filters.lastCheckedDays);
            filtered = filtered.filter((l) => new Date(l['Last Checked']) < cut);
        }
        setFilteredLocations(filtered);
        setPage(0);
    }, [filters, locations]);

    const handleEdit = (loc: Location) => {
        setEditLocation(loc);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this location?')) return;
            try {
                await LocationService.deleteLocation(id);
                await loadLocations();
        } catch {
            setError('Failed to delete.');
        }
    };

    const handleSave = async (loc: Location) => {
        try {
            if (editLocation) await LocationService.updateLocation(editLocation.ID, loc);
            else await LocationService.addLocation(loc);
            await loadLocations();
            setIsFormOpen(false);
            setEditLocation(null);
        } catch {
            setError('Failed to save.');
        }
    };

    const openMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const hasFilters =
        Boolean(filters.search) ||
        Boolean(filters.category) ||
        filters.tags.length > 0 ||
        filters.lastCheckedDays > 0;
    const clearFilters = () => setFilters({ search: '', category: '', tags: [], lastCheckedDays: 0 });

    const isNonDefaultSort = sortOption !== 'name-asc';
    const resetSort = () => setSortOption('name-asc');

    const sortedFilteredLocations = useMemo(
        () => sortLocations(filteredLocations, sortOption),
        [filteredLocations, sortOption]
    );

    const sliced = sortedFilteredLocations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const inputClass =
        'w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF]';
    const selectClass =
        'text-xs rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF]';
    const iconBtn =
        'p-2 rounded-lg text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 transition-colors';
    const iconBtnActive = 'text-[#9B8ACF] bg-[#9B8ACF]/10 hover:bg-[#9B8ACF]/15 hover:text-[#7B6CB8]';

    return (
        <div className="flex flex-col h-full gap-3 min-h-0">
            {/* Toolbar */}
            <div className={`${cardBase} p-3 sm:p-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-start gap-3 min-w-0 shrink-0">
                        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#9B8ACF]/10 text-[#9B8ACF]">
                            <MapPinIcon className="w-5 h-5" aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-800">Locations</h1>
                            {filteredLocations.length !== locations.length ? (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Showing {filteredLocations.length} of {locations.length}
                                </p>
                            ) : (
                                <p className="text-[11px] text-gray-500 mt-0.5">{locations.length} total</p>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0 sm:justify-end">
                        <div className="relative flex-1 min-w-[12rem] max-w-md">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search…"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowSort((v) => !v)}
                                className={`${iconBtn} ${showSort ? iconBtnActive : ''} ${
                                    isNonDefaultSort && !showSort ? 'ring-1 ring-[#9B8ACF]/40 text-[#7B6CB8]' : ''
                                }`}
                                title="Sort"
                                aria-expanded={showSort}
                            >
                                <ArrowsUpDownIcon className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowFilters((v) => !v)}
                                className={`${iconBtn} ${showFilters ? iconBtnActive : ''}`}
                                title="Filters"
                                aria-expanded={showFilters}
                            >
                                <FunnelIcon className="w-4 h-4" />
                            </button>
                            {hasFilters && (
                                <button type="button" onClick={clearFilters} className={iconBtn} title="Clear filters">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={loadLocations}
                                disabled={isLoading}
                                className={`${iconBtn} disabled:opacity-50`}
                                title="Refresh"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showSort && (
                <div className={`${cardBase} p-3 sm:p-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Sort</div>
                        {isNonDefaultSort && (
                            <button
                                type="button"
                                onClick={resetSort}
                                className="text-xs font-medium text-[#9B8ACF] hover:text-[#7B6CB8] rounded-lg px-2 py-0.5 hover:bg-[#9B8ACF]/10"
                            >
                                Reset to default
                            </button>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1.5">Order</label>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className={`${selectClass} w-full max-w-md py-2`}
                            aria-label="Sort order"
                        >
                            <option value="name-asc">Name (A–Z)</option>
                            <option value="name-desc">Name (Z–A)</option>
                            <option value="lastChecked-desc">Last checked (newest)</option>
                            <option value="lastChecked-asc">Last checked (oldest)</option>
                            <option value="address-asc">Address (A–Z)</option>
                            <option value="address-desc">Address (Z–A)</option>
                        </select>
                    </div>
                </div>
            )}

            {showFilters && (
                <div className={`${cardBase} p-3 sm:p-4`}>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">Filters</div>
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1.5">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">All</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1.5">Last checked</label>
                            <select
                                value={filters.lastCheckedDays}
                                onChange={(e) => setFilters({ ...filters, lastCheckedDays: Number(e.target.value) })}
                                className={selectClass}
                            >
                                <option value={0}>Any</option>
                                <option value={30}>30+ days ago</option>
                                <option value={90}>90+ days ago</option>
                                <option value={180}>180+ days ago</option>
                                <option value={365}>1+ year ago</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="px-3 py-2 text-sm bg-red-50 border border-red-200 rounded-lg text-red-800 shrink-0">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className={`flex-1 min-h-0 flex flex-col ${cardBase} overflow-hidden`}>
                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center py-16">
                        <ArrowPathIcon className="w-7 h-7 text-[#9B8ACF]/60 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-[1] bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/80">
                                <tr>
                                    <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Name
                                    </th>
                                    <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Categories
                                    </th>
                                    <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Address
                                    </th>
                                    <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Tags
                                    </th>
                                    <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Last checked
                                    </th>
                                    <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Last edited by
                                    </th>
                                    <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sliced.map((loc) => (
                                    <tr
                                        key={loc.ID}
                                        className={
                                            locationNeedsUpdate(loc)
                                                ? 'bg-orange-50/90 hover:bg-orange-100/80 transition-colors'
                                                : 'hover:bg-[#9B8ACF]/[0.06] transition-colors'
                                        }
                                    >
                                        <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-medium text-gray-900 truncate">{loc.Name}</span>
                                                {loc.Website && (
                                                    <a
                                                        href={loc.Website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#9B8ACF] shrink-0 rounded-md p-0.5 hover:bg-[#9B8ACF]/10"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(loc.Categories ?? []).map((c) => (
                                                    <span
                                                        key={c}
                                                        className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border border-[#9B8ACF]/35 bg-[#9B8ACF]/10 text-gray-800"
                                                    >
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-600 truncate max-w-[200px]">
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span className="truncate">{loc.Address}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => openMaps(loc.Latitude, loc.Longitude)}
                                                    className="text-[#9B8ACF] shrink-0 rounded-md p-0.5 hover:bg-[#9B8ACF]/10"
                                                    title="Open in Maps"
                                                >
                                                    <MapPinIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(loc.Tags || '')
                                                    .split(',')
                                                    .map((t) => t.trim())
                                                    .filter(Boolean)
                                                    .map((t, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-600 tabular-nums">
                                            {new Date(loc['Last Checked']).toLocaleDateString()}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-600 max-w-[160px]">
                                            <span
                                                className="block truncate"
                                                title={loc.lastEditedByUsername || undefined}
                                            >
                                                {loc.lastEditedByUsername || '—'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(loc)}
                                                className="inline-flex p-1.5 rounded-lg text-gray-500 hover:text-[#9B8ACF] hover:bg-[#9B8ACF]/10"
                                                title="Edit"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(loc.ID)}
                                                className="inline-flex p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div
                className={`${cardBase} px-3 py-2.5 sm:px-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-600`}
            >
                <span className="tabular-nums shrink-0">{filteredLocations.length} shown</span>
                <div
                    className="flex-1 min-w-[10rem] flex items-center gap-1.5 justify-center sm:justify-start max-w-full"
                    role="note"
                    aria-label="Row highlight legend"
                >
                    <span
                        className="inline-block w-7 h-2.5 rounded border border-orange-200/80 bg-orange-50/90 shrink-0"
                        aria-hidden
                    />
                    <span className="text-[11px] text-gray-600 leading-snug min-w-0">
                        Orange: last checked over 90 days ago — needs update.
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0 sm:ml-auto">
                    <label className="flex items-center gap-2">
                        <span className="text-gray-500">Rows per page</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                            className={selectClass + ' py-1'}
                        >
                            {[5, 10, 25, 50].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 rounded-lg font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none border border-gray-200/80 transition-colors"
                        >
                            Prev
                        </button>
                        <span className="px-2 tabular-nums text-gray-500">
                            {page + 1} / {Math.max(1, Math.ceil(filteredLocations.length / rowsPerPage))}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((p) =>
                                    Math.min(Math.ceil(filteredLocations.length / rowsPerPage) - 1, p + 1)
                                )
                            }
                            disabled={page >= Math.ceil(filteredLocations.length / rowsPerPage) - 1}
                            className="px-3 py-1.5 rounded-lg font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none border border-gray-200/80 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="md" fullWidth>
                <LocationForm
                    initialData={editLocation}
                    onSave={handleSave}
                    onCancel={() => {
                        setIsFormOpen(false);
                        setEditLocation(null);
                    }}
                />
            </Dialog>
            </ThemeProvider>
        </div>
    );
} 
