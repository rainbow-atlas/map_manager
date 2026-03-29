import { useEffect, useState } from 'react';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import LocationForm from './LocationForm';
import { Location } from '../types/Location';
import { PUBLIC_FORM_DEFAULT_CATEGORIES, PUBLIC_FORM_DEFAULT_TAGS } from '../services/LocationService';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.svg';

const INTRO_DE =
    'Fülle das Formular so detailliert wie möglich aus. Wenn du fertig bist, lädt dein Browser eine JSON-Datei herunter – auf dieser Seite wird nichts gespeichert. Schick die Datei zurück an uns, damit der Ort auf der Karte ergänzt oder aktualisiert werden kann.';

const IMAGE_URL_HINT_DE =
    'Tipp: Nutze eine Bild-URL, die du selbst hostest, oder lasse das Feld leer. Hast du keinen Link, sende das Bild bitte zusätzlich mit.';

/** `sessionStorage` key for draft restore after refresh (cleared when the tab closes or after JSON download). */
const PUBLIC_CONTRIBUTE_DRAFT_KEY = 'map_manager_public_contribute_draft_v1';

function slugFromName(name: string): string {
    const s = name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    return s || 'location';
}

function downloadLocationJson(location: Location) {
    const payload = {
        ...location,
        ID: location.ID ?? '',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugFromName(location.Name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function PublicContributePage() {
    const [categoryList, setCategoryList] = useState<string[]>(() => [...PUBLIC_FORM_DEFAULT_CATEGORIES]);
    const [tagList, setTagList] = useState<string[]>(() => [...PUBLIC_FORM_DEFAULT_TAGS]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [catRes, tagRes] = await Promise.all([
                    supabase.from('categories').select('name').order('name'),
                    supabase.from('tags').select('name').order('name'),
                ]);
                if (cancelled) return;
                const catNames = (catRes.data ?? [])
                    .map((r: { name: string }) => r.name?.trim())
                    .filter(Boolean) as string[];
                const tagNames = (tagRes.data ?? [])
                    .map((r: { name: string }) => r.name?.trim())
                    .filter(Boolean) as string[];
                setCategoryList(catNames.length > 0 ? catNames : [...PUBLIC_FORM_DEFAULT_CATEGORIES]);
                setTagList(tagNames.length > 0 ? tagNames : [...PUBLIC_FORM_DEFAULT_TAGS]);
            } catch (e) {
                console.error('Public contribute: could not load categories/tags', e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSave = (location: Location) => {
        downloadLocationJson(location);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #e8dcff 0%, #ffe8f4 38%, #dce8ff 72%, #f0e8ff 100%)',
            }}
        >
            {/* Stronger atmospheric layer (matches login page vibe) */}
            <Box
                sx={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.85,
                    background: `
                        radial-gradient(ellipse 85% 55% at 50% -15%, rgba(155, 138, 207, 0.55), transparent 52%),
                        radial-gradient(ellipse 70% 50% at 100% 35%, rgba(255, 181, 218, 0.42), transparent 55%),
                        radial-gradient(ellipse 55% 45% at 0% 85%, rgba(123, 108, 184, 0.28), transparent 50%),
                        radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.12), transparent 45%)
                    `,
                }}
            />
            <Box
                sx={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    width: 'min(560px, 95vw)',
                    height: 'min(560px, 95vw)',
                    borderRadius: '50%',
                    top: { xs: '-22%', md: '-14%' },
                    right: { xs: '-40%', md: '-10%' },
                    background: 'radial-gradient(circle, rgba(155,138,207,0.45) 0%, transparent 68%)',
                    filter: 'blur(2px)',
                }}
            />
            <Box
                sx={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    width: 'min(420px, 80vw)',
                    height: 'min(420px, 80vw)',
                    borderRadius: '50%',
                    bottom: { xs: '-12%', md: '2%' },
                    left: { xs: '-30%', md: '-8%' },
                    background: 'radial-gradient(circle, rgba(255,181,218,0.5) 0%, transparent 72%)',
                    filter: 'blur(2px)',
                }}
            />

            <Box
                component="header"
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.65)',
                    backgroundColor: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(22px) saturate(1.35)',
                    WebkitBackdropFilter: 'blur(22px) saturate(1.35)',
                    boxShadow: '0 8px 32px rgba(123, 108, 184, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                    px: { xs: 2, sm: 3 },
                    py: 2.5,
                }}
            >
                <Container maxWidth="lg">
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.75}>
                        <Box
                            component="img"
                            src={logo}
                            alt=""
                            aria-hidden
                            sx={{ height: 40, width: 40, flexShrink: 0, display: 'block' }}
                        />
                        <Typography
                            component="span"
                            sx={{
                                fontSize: '1.35rem',
                                fontWeight: 600,
                                letterSpacing: '-0.02em',
                                color: '#1a1528',
                            }}
                        >
                            queer map
                        </Typography>
                    </Stack>
                </Container>
            </Box>

            <Container
                maxWidth="lg"
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    py: { xs: 4, md: 6 },
                    px: { xs: 2, sm: 3 },
                }}
            >
                <Stack spacing={2} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
                    <Typography
                        variant="h3"
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.15,
                            fontSize: { xs: '1.85rem', sm: '2.25rem', md: '2.65rem' },
                            color: 'rgba(15,23,42,0.92)',
                            maxWidth: 640,
                        }}
                    >
                        Schlag einen Ort für die Karte vor
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'text.secondary',
                            maxWidth: { xs: '100%', sm: 'min(100%, 960px)' },
                            width: '100%',
                            lineHeight: 1.7,
                            fontSize: { xs: '0.95rem', sm: '1.02rem' },
                        }}
                    >
                        {INTRO_DE}
                    </Typography>
                </Stack>

                <Container maxWidth="md" disableGutters sx={{ px: 0 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: { xs: 4, sm: 6 },
                            border: '1px solid rgba(255,255,255,0.85)',
                            boxShadow: `
                            0 28px 56px rgba(123, 108, 184, 0.18),
                            0 0 0 1px rgba(255,255,255,0.95) inset,
                            0 1px 0 rgba(255,255,255,0.75) inset
                        `,
                            backgroundColor: 'rgba(255,255,255,0.72)',
                            backdropFilter: 'blur(18px) saturate(1.25)',
                            WebkitBackdropFilter: 'blur(18px) saturate(1.25)',
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{ p: { xs: 2, sm: 3, md: 3.5 } }}>
                            <LocationForm
                                initialData={null}
                                onSave={handleSave}
                                sessionDraftKey={PUBLIC_CONTRIBUTE_DRAFT_KEY}
                                categoryOptions={categoryList}
                                tagOptions={tagList}
                                formTitle="Angaben zum Ort"
                                submitLabel="JSON herunterladen"
                                disableImageUpload
                                imageUrlHelperText={IMAGE_URL_HINT_DE}
                                publicFormEnhancements
                            />
                        </Box>
                    </Paper>
                </Container>
            </Container>
        </Box>
    );
}
