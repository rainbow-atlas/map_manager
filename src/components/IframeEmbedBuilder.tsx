import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    ClipboardDocumentIcon,
    ArrowTopRightOnSquareIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    ScaleIcon,
    CommandLineIcon,
    PlusIcon,
    MinusIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { DEFAULT_QUEER_MAP_BASE_URL } from '../lib/publicMapUrls';
import { LocationService } from '../services/LocationService';
import type { Location } from '../types/Location';

const cardInner = 'rounded-lg border border-black/8 bg-gray-50/80 p-3 sm:p-4';

const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/30 focus:border-[#9B8ACF]';

/** Same shell as text inputs so selects match the rest of the form. */
const selectClass =
    `${inputClass} text-gray-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`;

const DEFAULT_BASE = import.meta.env.VITE_QUEER_MAP_EMBED_URL || DEFAULT_QUEER_MAP_BASE_URL;

type FullscreenMode = 'default' | 'true' | 'false';

interface IframeBuilderOptions {
    /** When `filters`, only category/tags are emitted; when `location`, only location params. */
    embedMode: 'filters' | 'location';
    category: string;
    tags: string[];
    fullscreen: FullscreenMode;
    hideLegal: boolean;
    /** Hide map +/- zoom buttons (hideMapZoom=true). */
    hideMapZoom: boolean;
    /** Hide settings gear, basemap panel, and locate (hideMapSettings=true). */
    hideMapSettings: boolean;
    debug: boolean;
    /** Numeric location id as in the public map (`locations.json`), same as DB `locations.id`. */
    locationId: string;
    /** Only when `location` is set: `preview` = map pin card only; `modal` = full detail (default). */
    locationDetail: 'modal' | 'preview';
}

/** Normalize user input into a CSS length for width/height attributes. */
function formatCssLength(value: string, fallback: string): string {
    const t = value.trim();
    if (!t) return fallback;
    if (/^[\d.]+%$/.test(t)) return t;
    if (/^[\d.]+\s*(px|em|rem|vh|vw)$/i.test(t)) return t.replace(/\s/g, '');
    if (/^\d+(\.\d+)?$/.test(t)) return `${t}px`;
    return t;
}

function normalizeTags(list: string[]): string {
    return [...new Set(list.map((t) => t.trim()).filter(Boolean))].join(',');
}

function buildMapUrl(baseInput: string, opts: IframeBuilderOptions): { url: string; error: string | null } {
    const trimmed = baseInput.trim();
    if (!trimmed) {
        return { url: '', error: 'Enter a base URL for the map.' };
    }
    let u: URL;
    try {
        u = new URL(trimmed);
    } catch {
        return { url: '', error: 'Invalid URL. Include http:// or https://' };
    }
    const p = new URLSearchParams();
    const locRaw =
        opts.embedMode === 'location' ? opts.locationId.trim() : '';
    const locNum = parseInt(locRaw, 10);
    const hasValidLocation = Boolean(locRaw && Number.isFinite(locNum) && locNum > 0);

    if (hasValidLocation) {
        p.set('location', String(locNum));
        if (opts.locationDetail === 'preview') {
            p.set('locationDetail', 'preview');
        }
    } else {
        if (opts.embedMode === 'filters' && opts.category.trim()) {
            p.set('category', opts.category.trim());
        }
        if (opts.embedMode === 'filters') {
            const tagsStr = normalizeTags(opts.tags);
            if (tagsStr) {
                p.set('tags', tagsStr);
            }
        }
    }
    if (opts.fullscreen === 'true') {
        p.set('fullscreen', 'true');
    } else if (opts.fullscreen === 'false') {
        p.set('fullscreen', 'false');
    }
    if (opts.hideLegal) {
        p.set('hideLegal', 'true');
    }
    if (opts.hideMapZoom) {
        p.set('hideMapZoom', 'true');
    }
    if (opts.hideMapSettings) {
        p.set('hideMapSettings', 'true');
    }
    if (opts.debug) {
        p.set('debug', 'true');
    }
    u.search = p.toString();
    return { url: u.toString(), error: null };
}

function buildIframeHtml(
    mapUrl: string,
    opts: {
        width: string;
        height: string;
        title: string;
        includeSandbox: boolean;
        includeScrolling: boolean;
    }
): string {
    const sandbox = opts.includeSandbox
        ? '\n  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"'
        : '';
    const scrolling = opts.includeScrolling ? '\n  scrolling="yes"' : '';
    return `<iframe
  src="${mapUrl}"
  width="${opts.width}"
  height="${opts.height}"
  frameborder="0"
  allow="geolocation"${scrolling}${sandbox}
  title="${opts.title.replace(/"/g, '&quot;')}"
></iframe>`;
}

export default function IframeEmbedBuilder() {
    const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE);
    const [category, setCategory] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [fullscreen, setFullscreen] = useState<FullscreenMode>('default');
    const [hideLegal, setHideLegal] = useState(false);
    const [hideMapZoom, setHideMapZoom] = useState(false);
    const [hideMapSettings, setHideMapSettings] = useState(false);
    const [debug, setDebug] = useState(false);
    const [locationId, setLocationId] = useState('');
    const [embedMode, setEmbedMode] = useState<'filters' | 'location'>('filters');
    const [locationDetailDisplay, setLocationDetailDisplay] = useState<'modal' | 'preview'>('modal');
    const [tagSearch, setTagSearch] = useState('');

    const [iframeWidth, setIframeWidth] = useState('100%');
    const [iframeHeight, setIframeHeight] = useState('480');
    const [iframeTitle, setIframeTitle] = useState('Queer Map');
    const [includeSandbox, setIncludeSandbox] = useState(false);
    const [includeScrolling, setIncludeScrolling] = useState(false);

    const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');

    const [knownCategories, setKnownCategories] = useState<string[]>([]);
    const [knownTags, setKnownTags] = useState<string[]>([]);
    const [locationsForPicker, setLocationsForPicker] = useState<Location[]>([]);

    useEffect(() => {
        setKnownCategories(LocationService.getCategories());
        setKnownTags([...new Set(LocationService.getTags())].sort((a, b) => a.localeCompare(b)));
        setLocationsForPicker(
            LocationService.getAllLocations()
                .slice()
                .sort((a, b) =>
                    (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' })
                )
        );
    }, []);

    const builderOpts: IframeBuilderOptions = useMemo(
        () => ({
            embedMode,
            category,
            tags: selectedTags,
            fullscreen,
            hideLegal,
            hideMapZoom,
            hideMapSettings,
            debug,
            locationId,
            locationDetail: locationDetailDisplay,
        }),
        [
            embedMode,
            category,
            selectedTags,
            fullscreen,
            hideLegal,
            hideMapZoom,
            hideMapSettings,
            debug,
            locationId,
            locationDetailDisplay,
        ]
    );

    const { url: mapUrl, error: urlError } = useMemo(
        () => buildMapUrl(baseUrl, builderOpts),
        [baseUrl, builderOpts]
    );

    const htmlSnippet = useMemo(() => {
        if (!mapUrl || urlError) {
            return '';
        }
        return buildIframeHtml(mapUrl, {
            width: formatCssLength(iframeWidth, '100%'),
            height: formatCssLength(iframeHeight, '600px'),
            title: iframeTitle,
            includeSandbox,
            includeScrolling,
        });
    }, [mapUrl, urlError, iframeWidth, iframeHeight, iframeTitle, includeSandbox, includeScrolling]);

    const switchToFilters = useCallback(() => {
        setEmbedMode('filters');
        setLocationId('');
        setTagSearch('');
    }, []);

    const switchToLocation = useCallback(() => {
        setEmbedMode('location');
        setCategory('');
        setSelectedTags([]);
        setTagSearch('');
    }, []);

    const onLocationSelect = useCallback((value: string) => {
        setLocationId(value);
        if (value) {
            setCategory('');
            setSelectedTags([]);
        }
    }, []);

    const tagsForDisplay = useMemo(() => {
        const q = tagSearch.trim().toLowerCase();
        return knownTags.filter((t) => {
            if (selectedTags.includes(t)) return true;
            if (!q) return true;
            return t.toLowerCase().includes(q);
        });
    }, [knownTags, tagSearch, selectedTags]);

    const toggleTag = useCallback((tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    }, []);

    const categorySelectValue =
        category === '' || knownCategories.includes(category) ? category : '';

    const handleCopy = async () => {
        if (!htmlSnippet) return;
        try {
            await navigator.clipboard.writeText(htmlSnippet);
            setCopyState('ok');
            setTimeout(() => setCopyState('idle'), 2000);
        } catch {
            setCopyState('err');
            setTimeout(() => setCopyState('idle'), 2000);
        }
    };

    const previewWidthCss = useMemo(() => formatCssLength(iframeWidth, '100%'), [iframeWidth]);
    const previewHeightCss = useMemo(() => formatCssLength(iframeHeight, '600px'), [iframeHeight]);

    return (
        <div className="flex flex-col gap-4 min-h-0">
            <div>
                <h2 className="text-sm font-semibold text-gray-800">Iframe embed builder</h2>
                <p className="text-[11px] text-gray-500 mt-1 max-w-2xl">
                    Configure the map URL and embed markup below, then check the live preview (uses your width, height,
                    title, and iframe options) and copy the HTML.
                </p>
            </div>

            <div className={`${cardInner} flex flex-col gap-4 min-h-0 overflow-visible`}>
                    <label className="block">
                        <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                            Map base URL
                        </span>
                        <input
                            type="url"
                            className={`${inputClass} mt-1 font-mono text-xs`}
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder={DEFAULT_QUEER_MAP_BASE_URL}
                            spellCheck={false}
                        />
                    </label>

                    <div>
                        <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                            What to share
                        </span>
                        <div
                            className="flex flex-wrap gap-1 p-1 mt-1.5 rounded-xl bg-gray-100/90 border border-black/5"
                            role="tablist"
                            aria-label="Embed target"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={embedMode === 'filters'}
                                onClick={switchToFilters}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                    embedMode === 'filters'
                                        ? 'bg-white text-gray-900 shadow-sm border border-black/8'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Category &amp; tags
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={embedMode === 'location'}
                                onClick={switchToLocation}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                    embedMode === 'location'
                                        ? 'bg-white text-gray-900 shadow-sm border border-black/8'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Single location
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">
                            The map URL uses one mode at a time: filters together, or one focused place — not both.
                        </p>
                    </div>

                    {embedMode === 'filters' && (
                        <div className="flex flex-col gap-3" role="tabpanel">
                            <label className="block">
                                <span className="text-[10px] text-gray-500">Category</span>
                                <select
                                    className={`${selectClass} mt-0.5`}
                                    value={categorySelectValue}
                                    onChange={(e) => setCategory(e.target.value)}
                                    aria-label="Category filter"
                                >
                                    <option value="">Any category</option>
                                    {knownCategories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div>
                                <span className="text-[10px] text-gray-500">Tags</span>
                                <p className="text-[10px] text-gray-500 mt-0.5 mb-2">
                                    Pick any combination; they are combined with the category in the URL.
                                </p>
                                <div className="relative mb-2">
                                    <MagnifyingGlassIcon
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                        aria-hidden
                                    />
                                    <input
                                        type="search"
                                        className={`${inputClass} pl-9 py-2 text-sm`}
                                        value={tagSearch}
                                        onChange={(e) => setTagSearch(e.target.value)}
                                        placeholder="Search tags…"
                                        aria-label="Search tags"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 min-h-[2rem]">
                                    {tagsForDisplay.length === 0 ? (
                                        <p className="text-[10px] text-gray-500 py-1">No tags match your search.</p>
                                    ) : (
                                        tagsForDisplay.map((tag) => {
                                            const on = selectedTags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() => toggleTag(tag)}
                                                    className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
                                                        on
                                                            ? 'bg-[#9B8ACF]/20 border-[#9B8ACF]/40 text-gray-900'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedTags.length > 0 && (
                                    <p className="text-[10px] text-gray-600 mt-2">
                                        Active:{' '}
                                        <span className="font-mono text-[11px]">{normalizeTags(selectedTags)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {embedMode === 'location' && (
                        <div className="flex flex-col gap-3 border-t border-black/8 pt-3" role="tabpanel">
                            <label className="block">
                                <span className="text-[10px] text-gray-500">Location</span>
                                <select
                                    className={`${selectClass} mt-0.5`}
                                    value={
                                        locationsForPicker.some((l) => l.ID === locationId) ? locationId : ''
                                    }
                                    onChange={(e) => onLocationSelect(e.target.value)}
                                    aria-label="Pick a location to focus"
                                >
                                    <option value="">Select a location…</option>
                                    {locationsForPicker.map((loc) => (
                                        <option key={loc.ID} value={loc.ID}>
                                            {loc.Name || '(no name)'} (#{loc.ID})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <fieldset className="border-0 p-0 m-0">
                                <legend className="text-[10px] text-gray-500 mb-1.5">
                                    When the map opens
                                </legend>
                                <div className="flex flex-col gap-2">
                                    <label className="inline-flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="location-detail"
                                            className="mt-0.5 rounded-full border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30"
                                            checked={locationDetailDisplay === 'preview'}
                                            onChange={() => setLocationDetailDisplay('preview')}
                                        />
                                        <span>
                                            <span className="text-sm text-gray-800">Map preview</span>
                                            <span className="block text-[10px] text-gray-500">
                                                Center the pin and show the small card on the map (no modal).
                                            </span>
                                        </span>
                                    </label>
                                    <label className="inline-flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="location-detail"
                                            className="mt-0.5 rounded-full border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30"
                                            checked={locationDetailDisplay === 'modal'}
                                            onChange={() => setLocationDetailDisplay('modal')}
                                        />
                                        <span>
                                            <span className="text-sm text-gray-800">Full detail modal</span>
                                            <span className="block text-[10px] text-gray-500">
                                                Open the large detail overlay (default; no extra URL param).
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </fieldset>

                            {locationId ? (
                                <button
                                    type="button"
                                    onClick={() => setLocationId('')}
                                    className="self-start text-[10px] text-[#7B6CB8] hover:underline"
                                >
                                    Clear location
                                </button>
                            ) : null}
                        </div>
                    )}

                    <fieldset className="border-0 p-0 m-0">
                        <legend className="text-[11px] font-medium text-gray-600 uppercase tracking-wide mb-2">
                            Fullscreen / sidebar
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ['default', 'Default (omit param)'],
                                    ['true', 'Fullscreen (no sidebar)'],
                                    ['false', 'Show sidebar (explicit)'],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFullscreen(value)}
                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                        fullscreen === value
                                            ? 'bg-[#9B8ACF]/15 border-[#9B8ACF]/40 text-gray-900'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="border-0 p-0 m-0">
                        <legend className="text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">
                            Map chrome &amp; troubleshooting
                        </legend>
                        <div className="flex flex-col gap-1">
                            <label
                                className={`flex items-start gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${
                                    hideLegal
                                        ? 'border-[#9B8ACF]/45 bg-[#9B8ACF]/[0.08] shadow-[inset_0_0_0_1px_rgba(155,138,207,0.12)]'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30 shrink-0"
                                    checked={hideLegal}
                                    onChange={(e) => setHideLegal(e.target.checked)}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <ScaleIcon className="w-3 h-3 text-gray-500 shrink-0" aria-hidden />
                                        <span className="text-[11px] font-medium text-gray-900 leading-tight">
                                            Hide legal links
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                                        Omit privacy &amp; imprint in the map chrome for minimal embeds.
                                    </p>
                                    <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                                        <span className="text-gray-500">hideLegal=true</span>
                                    </p>
                                </div>
                            </label>
                            <label
                                className={`flex items-start gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${
                                    hideMapZoom
                                        ? 'border-[#9B8ACF]/45 bg-[#9B8ACF]/[0.08] shadow-[inset_0_0_0_1px_rgba(155,138,207,0.12)]'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30 shrink-0"
                                    checked={hideMapZoom}
                                    onChange={(e) => setHideMapZoom(e.target.checked)}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <span className="inline-flex items-center gap-0.5 shrink-0" aria-hidden>
                                            <MinusIcon className="w-3 h-3 text-gray-500" />
                                            <PlusIcon className="w-3 h-3 text-gray-500" />
                                        </span>
                                        <span className="text-[11px] font-medium text-gray-900 leading-tight">
                                            Hide zoom buttons
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                                        Remove the + / − controls on the map.
                                    </p>
                                    <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                                        <span className="text-gray-500">hideMapZoom=true</span>
                                    </p>
                                </div>
                            </label>
                            <label
                                className={`flex items-start gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${
                                    hideMapSettings
                                        ? 'border-[#9B8ACF]/45 bg-[#9B8ACF]/[0.08] shadow-[inset_0_0_0_1px_rgba(155,138,207,0.12)]'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30 shrink-0"
                                    checked={hideMapSettings}
                                    onChange={(e) => setHideMapSettings(e.target.checked)}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <Cog6ToothIcon className="w-3 h-3 text-gray-500 shrink-0" aria-hidden />
                                        <span className="text-[11px] font-medium text-gray-900 leading-tight">
                                            Hide map settings
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                                        Remove the gear, basemap / overlay options, and “my location”.
                                    </p>
                                    <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                                        <span className="text-gray-500">hideMapSettings=true</span>
                                    </p>
                                </div>
                            </label>
                            <label
                                className={`flex items-start gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${
                                    debug
                                        ? 'border-[#9B8ACF]/45 bg-[#9B8ACF]/[0.08] shadow-[inset_0_0_0_1px_rgba(155,138,207,0.12)]'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30 shrink-0"
                                    checked={debug}
                                    onChange={(e) => setDebug(e.target.checked)}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <CommandLineIcon className="w-3 h-3 text-gray-500 shrink-0" aria-hidden />
                                        <span className="text-[11px] font-medium text-gray-900 leading-tight">
                                            Show embed debug info
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                                        Header readout: iframe vs page, fullscreen vs sidebar.
                                    </p>
                                    <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                                        <span className="text-gray-500">debug=true</span>
                                    </p>
                                </div>
                            </label>
                        </div>
                    </fieldset>

                    <div className="border-t border-black/8 pt-3 mt-1">
                        <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide mb-2">
                            Embed markup
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="text-[10px] text-gray-500">Width</span>
                                <input
                                    className={`${inputClass} mt-0.5 font-mono text-xs`}
                                    value={iframeWidth}
                                    onChange={(e) => setIframeWidth(e.target.value)}
                                    placeholder="100%"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] text-gray-500">Height</span>
                                <input
                                    className={`${inputClass} mt-0.5 font-mono text-xs`}
                                    value={iframeHeight}
                                    onChange={(e) => setIframeHeight(e.target.value)}
                                    placeholder="480"
                                />
                            </label>
                        </div>
                        <label className="block mt-2">
                            <span className="text-[10px] text-gray-500">Iframe title</span>
                            <input
                                className={`${inputClass} mt-0.5`}
                                value={iframeTitle}
                                onChange={(e) => setIframeTitle(e.target.value)}
                            />
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer mt-2">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30"
                                checked={includeScrolling}
                                onChange={(e) => setIncludeScrolling(e.target.checked)}
                            />
                            <span className="text-xs text-gray-700">Include scrolling=&quot;yes&quot;</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#9B8ACF] focus:ring-[#9B8ACF]/30"
                                checked={includeSandbox}
                                onChange={(e) => setIncludeSandbox(e.target.checked)}
                            />
                            <span className="text-xs text-gray-700">Include sandbox (see docs)</span>
                        </label>
                    </div>
            </div>

            <div className={`${cardInner} flex flex-col gap-3 min-h-0`}>
                        <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
                            <div>
                                <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                                    Preview
                                </span>
                                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                                    {previewWidthCss} × {previewHeightCss}
                                    {iframeTitle ? ` · ${iframeTitle}` : ''}
                                </p>
                            </div>
                            {mapUrl && !urlError && (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-[#7B6CB8] hover:underline shrink-0"
                                >
                                    Open URL
                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                        {urlError && (
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                                {urlError}
                            </p>
                        )}
                        {mapUrl && !urlError && (
                            <>
                                <p className="text-[10px] font-mono text-gray-500 break-all shrink-0">{mapUrl}</p>
                                <div className="w-full overflow-x-auto rounded-lg border border-black/10 bg-gray-100 shadow-inner">
                                    <div
                                        style={{
                                            width:
                                                previewWidthCss.includes('%') || previewWidthCss === '100%'
                                                    ? '100%'
                                                    : previewWidthCss,
                                            maxWidth: '100%',
                                        }}
                                    >
                                        <iframe
                                            key={`${mapUrl}|${previewWidthCss}|${previewHeightCss}|${includeSandbox}|${includeScrolling}|${iframeTitle}`}
                                            title={iframeTitle.trim() || 'Queer Map preview'}
                                            src={mapUrl}
                                            allow="geolocation"
                                            {...(includeScrolling ? { scrolling: 'yes' as const } : {})}
                                            {...(includeSandbox
                                                ? {
                                                      sandbox:
                                                          'allow-same-origin allow-scripts allow-popups allow-forms',
                                                  }
                                                : {})}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                height: previewHeightCss,
                                                border: 'none',
                                                backgroundColor: '#fff',
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
            </div>

            <div className={`${cardInner} flex flex-col gap-2`}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                                HTML snippet
                            </span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                disabled={!htmlSnippet}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#9B8ACF] hover:bg-[#7B6CB8] text-gray-900 disabled:opacity-40 disabled:pointer-events-none"
                            >
                                {copyState === 'ok' ? (
                                    <>
                                        <CheckIcon className="w-4 h-4" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <ClipboardDocumentIcon className="w-4 h-4" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                        {copyState === 'err' && (
                            <p className="text-[10px] text-red-600">Clipboard unavailable — select and copy manually.</p>
                        )}
                        <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-gray-800 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                            {htmlSnippet || 'Fix the URL above to generate HTML.'}
                        </pre>
            </div>
        </div>
    );
}
