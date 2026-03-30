import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CodeBracketIcon,
    LinkIcon,
    ShareIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    CloudArrowUpIcon,
    DocumentTextIcon,
    XMarkIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import IframeEmbedBuilder from './IframeEmbedBuilder';
import LocationForm from './LocationForm';
import { LocationService } from '../services/LocationService';
import { AppSettingsService } from '../services/AppSettingsService';
import type { Location } from '../types/Location';
import { parseContributedLocationJson } from '../lib/parseContributedLocationJson';

const cardBase =
    'bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/10';

const cardInner = 'rounded-lg border border-black/8 bg-gray-50/80 p-3 sm:p-4';

const inputReadonlyClass =
    'w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] text-gray-800';

const btnSecondaryClass =
    'inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:pointer-events-none';

const btnPrimaryClass =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#9B8ACF] text-white hover:bg-[#8a79c0] shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none';

type ScriptsTab = 'main' | 'import-forms' | 'impressum';

function isLikelyJsonFile(file: File): boolean {
    const n = file.name.toLowerCase();
    if (n.endsWith('.json')) return true;
    const t = file.type;
    return t === 'application/json' || t === 'text/json' || t === 'application/ld+json';
}

function getContributePageUrl(): string {
    const base = import.meta.env.BASE_URL || '/';
    const path = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${window.location.origin}${path}/contribute`;
}

export default function ScriptsPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<ScriptsTab>('main');
    const contributeUrl = useMemo(() => getContributePageUrl(), []);
    const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');
    const [shareHint, setShareHint] = useState<string | null>(null);

    const jsonInputRef = useRef<HTMLInputElement>(null);
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [jsonRejectHint, setJsonRejectHint] = useState<string | null>(null);
    const [dropActive, setDropActive] = useState(false);
    const [importPhase, setImportPhase] = useState<'upload' | 'review'>('upload');
    const [reviewLocation, setReviewLocation] = useState<Location | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parseBusy, setParseBusy] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveBusy, setSaveBusy] = useState(false);
    const saveLockRef = useRef(false);
    const impressumEditorRef = useRef<HTMLDivElement>(null);
    const [impressumValue, setImpressumValue] = useState('');
    const [impressumSavedValue, setImpressumSavedValue] = useState('');
    const [impressumLoadBusy, setImpressumLoadBusy] = useState(false);
    const [impressumSaveBusy, setImpressumSaveBusy] = useState(false);
    const [impressumError, setImpressumError] = useState<string | null>(null);
    const [impressumSaveHint, setImpressumSaveHint] = useState<string | null>(null);
    const impressumHasLocalEditsRef = useRef(false);

    const hasImpressumChanges = impressumValue !== impressumSavedValue;

    const readEditorHtml = useCallback((): string => {
        const html = impressumEditorRef.current?.innerHTML ?? '';
        const normalized = html.trim();
        if (normalized === '<br>' || normalized === '<div><br></div>' || normalized === '<p><br></p>') {
            return '';
        }
        return normalized;
    }, []);

    const copyContributeLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(contributeUrl);
            setCopyState('ok');
            setTimeout(() => setCopyState('idle'), 2000);
        } catch {
            setCopyState('err');
            setTimeout(() => setCopyState('idle'), 2500);
        }
    }, [contributeUrl]);

    const shareContributeLink = useCallback(async () => {
        setShareHint(null);
        const title = 'Contribute a location';
        const text = 'Open the form to suggest a place for the map.';
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title, text, url: contributeUrl });
                return;
            } catch (e: unknown) {
                const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : '';
                if (name === 'AbortError') return;
            }
        }
        await copyContributeLink();
        setShareHint('Link copied — your browser has no share dialog here.');
        setTimeout(() => setShareHint(null), 4000);
    }, [contributeUrl, copyContributeLink]);

    const pickJsonFile = useCallback((file: File | null | undefined) => {
        setJsonRejectHint(null);
        setParseError(null);
        if (!file) return;
        if (!isLikelyJsonFile(file)) {
            setJsonRejectHint('Please choose a .json file (exported form data).');
            return;
        }
        setJsonFile(file);
        setImportPhase('upload');
        setReviewLocation(null);
    }, []);

    const onJsonInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            pickJsonFile(f ?? null);
            e.target.value = '';
        },
        [pickJsonFile]
    );

    const onDropZoneDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropActive(true);
    }, []);

    const onDropZoneDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropActive(false);
    }, []);

    const onDropZoneDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDropActive(false);
            const f = e.dataTransfer.files?.[0];
            pickJsonFile(f ?? null);
        },
        [pickJsonFile]
    );

    const clearJsonFile = useCallback(() => {
        setJsonFile(null);
        setJsonRejectHint(null);
        setParseError(null);
        setImportPhase('upload');
        setReviewLocation(null);
    }, []);

    const backFromReview = useCallback(() => {
        setImportPhase('upload');
        setReviewLocation(null);
        setSaveError(null);
        setParseError(null);
    }, []);

    const runProcessing = useCallback(async () => {
        if (!jsonFile) return;
        setParseError(null);
        setSaveError(null);
        setParseBusy(true);
        try {
            const text = await jsonFile.text();
            const result = parseContributedLocationJson(text);
            if (!result.ok) {
                setParseError(result.error);
                return;
            }
            setReviewLocation(result.location);
            setImportPhase('review');
        } catch {
            setParseError('Could not read the file.');
        } finally {
            setParseBusy(false);
        }
    }, [jsonFile]);

    const handleImportSave = useCallback(
        async (location: Location) => {
            if (saveLockRef.current) return;
            saveLockRef.current = true;
            setSaveBusy(true);
            setSaveError(null);
            try {
                const {
                    ID: _id,
                    createdByUsername: _c,
                    lastEditedByUsername: _l,
                    recordUpdatedAt: _r,
                    ...formData
                } = location;
                await LocationService.addLocation(formData);
                navigate('/locations');
            } catch (e) {
                console.error(e);
                setSaveError(e instanceof Error ? e.message : 'Failed to add location.');
            } finally {
                saveLockRef.current = false;
                setSaveBusy(false);
            }
        },
        [navigate]
    );

    const loadImpressum = useCallback(async (force = false) => {
        setImpressumError(null);
        setImpressumLoadBusy(true);
        try {
            const value = await AppSettingsService.getImpressum();
            if (!force && impressumHasLocalEditsRef.current) {
                return;
            }
            if (impressumEditorRef.current) {
                impressumEditorRef.current.innerHTML = value || '';
            }
            setImpressumValue(value);
            setImpressumSavedValue(value);
            impressumHasLocalEditsRef.current = false;
        } catch (e) {
            setImpressumError(e instanceof Error ? e.message : 'Failed to load impressum.');
        } finally {
            setImpressumLoadBusy(false);
        }
    }, []);

    const saveImpressum = useCallback(async () => {
        setImpressumError(null);
        setImpressumSaveHint(null);
        setImpressumSaveBusy(true);
        try {
            const html = readEditorHtml();
            await AppSettingsService.saveImpressum(html);
            setImpressumValue(html);
            setImpressumSavedValue(html);
            impressumHasLocalEditsRef.current = false;
            setImpressumSaveHint('Saved.');
            setTimeout(() => setImpressumSaveHint(null), 2200);
        } catch (e) {
            setImpressumError(e instanceof Error ? e.message : 'Failed to save impressum.');
        } finally {
            setImpressumSaveBusy(false);
        }
    }, [readEditorHtml]);

    const runEditorCommand = useCallback((command: string, value?: string) => {
        const editor = impressumEditorRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, value);
        impressumHasLocalEditsRef.current = true;
        setImpressumValue(readEditorHtml());
    }, [readEditorHtml]);

    const insertEditorLink = useCallback(() => {
        const href = window.prompt('Link URL', 'https://');
        if (!href) return;
        runEditorCommand('createLink', href);
    }, [runEditorCommand]);

    const onEditorInput = useCallback(() => {
        impressumHasLocalEditsRef.current = true;
        setImpressumValue(readEditorHtml());
    }, [readEditorHtml]);

    React.useEffect(() => {
        if (tab !== 'impressum') return;
        if (impressumSavedValue || impressumValue || impressumLoadBusy) return;
        void loadImpressum();
    }, [tab, loadImpressum, impressumSavedValue, impressumValue, impressumLoadBusy]);

    return (
        <div className="flex flex-col h-full gap-3 min-h-0">
            <div className={`${cardBase} p-3 sm:p-4 shrink-0`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 min-w-0">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#9B8ACF]/10 text-[#9B8ACF]">
                            <CodeBracketIcon className="w-5 h-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold text-gray-800">Scripts</h1>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Utilities and batch operations for your map data
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100/90 border border-black/5 shrink-0 self-end sm:self-auto sm:ml-auto"
                        role="tablist"
                        aria-label="Scripts sections"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'main'}
                            id="scripts-tab-main"
                            aria-controls="scripts-panel-main"
                            onClick={() => setTab('main')}
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                tab === 'main'
                                    ? 'bg-white text-gray-900 shadow-sm border border-black/8'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            iframe
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'import-forms'}
                            id="scripts-tab-import"
                            aria-controls="scripts-panel-import"
                            onClick={() => setTab('import-forms')}
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                tab === 'import-forms'
                                    ? 'bg-white text-gray-900 shadow-sm border border-black/8'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            import from forms
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'impressum'}
                            id="scripts-tab-impressum"
                            aria-controls="scripts-panel-impressum"
                            onClick={() => setTab('impressum')}
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                tab === 'impressum'
                                    ? 'bg-white text-gray-900 shadow-sm border border-black/8'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            impressum
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                {tab === 'main' && (
                    <div
                        role="tabpanel"
                        id="scripts-panel-main"
                        aria-labelledby="scripts-tab-main"
                        className={`${cardBase} flex-1 min-h-0 p-4 sm:p-5 min-h-[60vh]`}
                    >
                        <IframeEmbedBuilder />
                    </div>
                )}

                {tab === 'import-forms' && (
                    <div
                        role="tabpanel"
                        id="scripts-panel-import"
                        aria-labelledby="scripts-tab-import"
                        className={`${cardBase} flex-1 min-h-0 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden`}
                    >
                        {importPhase === 'review' && reviewLocation ? (
                            <div className="flex flex-col flex-1 min-h-0 gap-3">
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        className={`${btnSecondaryClass} py-2`}
                                        onClick={backFromReview}
                                        disabled={saveBusy}
                                    >
                                        <ArrowLeftIcon className="w-4 h-4" aria-hidden />
                                        Back to upload
                                    </button>
                                    <span className="text-sm font-medium text-gray-800">Review imported location</span>
                                    {jsonFile && (
                                        <span
                                            className="text-[11px] font-mono text-gray-500 truncate max-w-[min(100%,14rem)]"
                                            title={jsonFile.name}
                                        >
                                            {jsonFile.name}
                                        </span>
                                    )}
                                </div>
                                {saveBusy && (
                                    <p className="text-xs text-gray-600 flex items-center gap-2 shrink-0" role="status">
                                        <span
                                            className="inline-block h-4 w-4 rounded-full border-2 border-[#9B8ACF]/30 border-t-[#9B8ACF] animate-spin"
                                            aria-hidden
                                        />
                                        Saving to the database…
                                    </p>
                                )}
                                {saveError && (
                                    <div
                                        className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shrink-0"
                                        role="alert"
                                    >
                                        {saveError}
                                    </div>
                                )}
                                <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-4 sm:p-6">
                                    <div className="max-w-3xl mx-auto">
                                        <LocationForm
                                            key={`import-${jsonFile?.name ?? 'draft'}`}
                                            initialData={reviewLocation}
                                            onSave={handleImportSave}
                                            onCancel={saveBusy ? undefined : backFromReview}
                                            categoryOptions={LocationService.getCategories()}
                                            tagOptions={LocationService.getTags()}
                                            formTitle="Review imported location"
                                            submitLabel="Add to locations"
                                            cancelLabel="Back to upload"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Import from forms</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-xl">
                                        Share the public contribute link so anyone can submit a location without signing
                                        in. They download JSON from the form; you upload it here, review and edit, then
                                        add it to your locations.
                                    </p>
                                </div>

                                <div className={cardInner}>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-600 uppercase tracking-wide">
                                        <LinkIcon className="w-3.5 h-3.5 text-gray-500" aria-hidden />
                                        Contribute link
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                                        <input
                                            readOnly
                                            type="text"
                                            className={`${inputReadonlyClass} min-w-0 flex-1`}
                                            value={contributeUrl}
                                            aria-label="Contribute page URL"
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <div className="flex flex-wrap gap-2 shrink-0">
                                            <button
                                                type="button"
                                                className={btnSecondaryClass}
                                                onClick={copyContributeLink}
                                            >
                                                {copyState === 'ok' ? (
                                                    <>
                                                        <CheckIcon className="w-4 h-4 text-emerald-600" aria-hidden />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <ClipboardDocumentIcon
                                                            className="w-4 h-4 text-gray-500"
                                                            aria-hidden
                                                        />
                                                        Copy
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className={btnSecondaryClass}
                                                onClick={shareContributeLink}
                                            >
                                                <ShareIcon className="w-4 h-4 text-gray-500" aria-hidden />
                                                Share
                                            </button>
                                        </div>
                                    </div>
                                    {copyState === 'err' && (
                                        <p className="text-[11px] text-amber-800 mt-2" role="status">
                                            Could not copy — select the field and copy manually (⌘C / Ctrl+C).
                                        </p>
                                    )}
                                    {shareHint && (
                                        <p className="text-[11px] text-gray-600 mt-2" role="status">
                                            {shareHint}
                                        </p>
                                    )}
                                </div>

                                <div className={cardInner}>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-600 uppercase tracking-wide">
                                        <DocumentTextIcon className="w-3.5 h-3.5 text-gray-500" aria-hidden />
                                        Form export (JSON)
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1 max-w-xl">
                                        Upload the JSON file from the public contribute form download action.
                                    </p>

                                    <input
                                        ref={jsonInputRef}
                                        type="file"
                                        accept=".json,application/json"
                                        className="hidden"
                                        tabIndex={-1}
                                        onChange={onJsonInputChange}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => jsonInputRef.current?.click()}
                                        onDragOver={onDropZoneDragOver}
                                        onDragLeave={onDropZoneDragLeave}
                                        onDrop={onDropZoneDrop}
                                        aria-label="Upload JSON file: drop a file or click to choose"
                                        className={`
                                    mt-3 w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors
                                    ${
                                        dropActive
                                            ? 'border-[#9B8ACF] bg-[#9B8ACF]/[0.07]'
                                            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50/80'
                                    }
                                `}
                                    >
                                        <CloudArrowUpIcon
                                            className={`mx-auto h-10 w-10 ${dropActive ? 'text-[#9B8ACF]' : 'text-gray-400'}`}
                                            aria-hidden
                                        />
                                        <p className="mt-2 text-sm font-medium text-gray-800">
                                            {jsonFile ? jsonFile.name : 'Drop JSON here or click to upload'}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {jsonFile
                                                ? `${(jsonFile.size / 1024).toFixed(1)} KB`
                                                : '.json from the contribute form'}
                                        </p>
                                    </button>

                                    {jsonRejectHint && (
                                        <p className="text-[11px] text-amber-800 mt-2" role="status">
                                            {jsonRejectHint}
                                        </p>
                                    )}

                                    {parseError && (
                                        <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mt-2" role="alert">
                                            {parseError}
                                        </p>
                                    )}

                                    {jsonFile && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={clearJsonFile}
                                                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900"
                                            >
                                                <XMarkIcon className="w-3.5 h-3.5" aria-hidden />
                                                Remove file
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            className={`${btnPrimaryClass} w-full sm:w-auto min-w-[11rem]`}
                                            disabled={!jsonFile || parseBusy}
                                            onClick={() => void runProcessing()}
                                        >
                                            {parseBusy ? 'Reading…' : 'Processing'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'impressum' && (
                    <div
                        role="tabpanel"
                        id="scripts-panel-impressum"
                        aria-labelledby="scripts-tab-impressum"
                        className={`${cardBase} flex-1 min-h-0 p-4 sm:p-5 flex flex-col gap-3 overflow-hidden`}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-medium text-gray-800">Impressum</p>
                                <p className="text-xs text-gray-500">Write your legal notice with inline formatting.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className={btnSecondaryClass}
                                    onClick={() => void loadImpressum(true)}
                                    disabled={impressumLoadBusy || impressumSaveBusy}
                                >
                                    Reload
                                </button>
                                <button
                                    type="button"
                                    className={btnPrimaryClass}
                                    onClick={() => void saveImpressum()}
                                    disabled={!hasImpressumChanges || impressumSaveBusy || impressumLoadBusy}
                                >
                                    {impressumSaveBusy ? 'Saving…' : 'Save impressum'}
                                </button>
                            </div>
                        </div>

                        {impressumError && (
                            <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                                {impressumError}
                            </p>
                        )}

                        {impressumSaveHint && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2" role="status">
                                {impressumSaveHint}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('bold')}>
                                Bold
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('italic')}>
                                Italic
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('formatBlock', 'H1')}>
                                H1
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('formatBlock', 'H2')}>
                                H2
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('insertUnorderedList')}>
                                Bullet list
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('insertOrderedList')}>
                                Numbered list
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={insertEditorLink}>
                                Link
                            </button>
                            <button type="button" className={btnSecondaryClass} onClick={() => runEditorCommand('removeFormat')}>
                                Clear format
                            </button>
                        </div>

                        <div
                            ref={impressumEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={onEditorInput}
                            className="w-full flex-1 min-h-[20rem] overflow-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/40"
                            data-placeholder="Write your impressum..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
