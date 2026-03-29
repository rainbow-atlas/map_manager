import React from 'react';

const defaultLinkClass =
    'text-[#9B8ACF] underline decoration-[#9B8ACF]/40 underline-offset-2 hover:decoration-[#9B8ACF]';

/**
 * Only allow http(s) URLs for href to avoid javascript: and other XSS vectors.
 */
export function safeHttpHref(raw: string): string | null {
    let s = raw.trim();
    if (!s) return null;
    try {
        if (s.startsWith('www.')) {
            s = `https://${s}`;
        }
        const u = new URL(s);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
            return u.href;
        }
    } catch {
        return null;
    }
    return null;
}

function trimUrlCandidate(raw: string): string {
    return raw.replace(/[.,;:!?)]+$/g, '');
}

function linkifyPlainSegment(s: string, keyBase: number, linkClass: string): React.ReactNode[] {
    if (!s) return [];
    const out: React.ReactNode[] = [];
    const re = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    let last = 0;
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    let k = keyBase;
    while ((m = r.exec(s)) !== null) {
        if (m.index > last) {
            out.push(s.slice(last, m.index));
        }
        const candidate = trimUrlCandidate(m[0]);
        const href = safeHttpHref(candidate);
        if (href) {
            out.push(
                <a key={k++} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {m[0]}
                </a>
            );
        } else {
            out.push(m[0]);
        }
        last = m.index + m[0].length;
    }
    if (last < s.length) {
        out.push(s.slice(last));
    }
    return out;
}

/**
 * Parses optional markdown links `[label](url)` and autolinks plain `https://` / `www.` URLs.
 */
export function parseDescriptionToNodes(text: string, linkClass: string = defaultLinkClass): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let pos = 0;
    let key = 0;

    while (pos < text.length) {
        const mdStart = text.indexOf('[', pos);
        if (mdStart === -1) {
            nodes.push(...linkifyPlainSegment(text.slice(pos), key, linkClass));
            break;
        }
        if (mdStart > pos) {
            nodes.push(...linkifyPlainSegment(text.slice(pos, mdStart), key, linkClass));
            key += mdStart - pos + 5000;
        }
        const sub = text.slice(mdStart);
        const mdMatch = sub.match(/^\[([^\]]*)\]\(([^)]*)\)/);
        if (mdMatch) {
            const href = safeHttpHref(mdMatch[2]);
            const label = mdMatch[1]?.length ? mdMatch[1] : mdMatch[2];
            if (href) {
                nodes.push(
                    <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {label}
                    </a>
                );
            } else {
                nodes.push(mdMatch[0]);
            }
            pos = mdStart + mdMatch[0].length;
        } else {
            nodes.push('[');
            pos = mdStart + 1;
        }
    }
    return nodes;
}

export type LinkifiedDescriptionProps = {
    text: string;
    className?: string;
    linkClassName?: string;
};

/**
 * Renders location description with clickable links (markdown `[text](url)` and plain URLs).
 */
export function LinkifiedDescription({ text, className, linkClassName }: LinkifiedDescriptionProps) {
    if (!text?.trim()) return null;
    const linkCls = linkClassName ?? defaultLinkClass;
    const nodes = parseDescriptionToNodes(text, linkCls);
    return <span className={['whitespace-pre-wrap break-words', className].filter(Boolean).join(' ')}>{nodes}</span>;
}
