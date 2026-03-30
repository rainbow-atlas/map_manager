import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    TextField,
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Typography,
    Divider,
    InputAdornment,
    Alert,
    AlertTitle,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    IconButton,
    Popover,
    Collapse,
} from '@mui/material';
import {
    Instagram as InstagramIcon,
    FacebookOutlined as FacebookIcon,
} from '@mui/icons-material';
import { Location } from '../types/Location';
import { LocationService } from '../services/LocationService';
import { Autocomplete } from '@mui/material';
import { useLoadScript } from '@react-google-maps/api';
import Logger from '../utils/logger';
import { supabase } from '../lib/supabase';
import { LinkifiedDescription } from '../lib/linkifyDescription';
import {
    GlobeAltIcon as WebsiteFieldIcon,
    PhoneIcon as PhoneFieldIcon,
    EnvelopeIcon as EmailFieldIcon,
    MapPinIcon as PlaceFieldIcon,
    MapIcon as MapFieldIcon,
    InformationCircleIcon as InfoFieldIcon,
} from '@heroicons/react/24/outline';
import {
    clearLocationFormDraft,
    loadLocationFormDraft,
    saveLocationFormDraft,
} from '../lib/locationFormDraft';

interface LocationFormProps {
    initialData: Location | null;
    onSave: (location: Location) => void;
    /** Omit on the public contribute page to hide the cancel/close control. */
    onCancel?: () => void;
    /** When set, draft is restored from `sessionStorage` and saved on change (survives refresh; cleared when the tab closes or after a successful submit). */
    sessionDraftKey?: string;
    /** When set, category/tag lists are not read from LocationService (e.g. public JSON form). */
    categoryOptions?: string[];
    tagOptions?: string[];
    formTitle?: string;
    submitLabel?: string;
    cancelLabel?: string;
    /** Hide Supabase image upload; image URL field remains. */
    disableImageUpload?: boolean;
    /** Shown under the image URL field (e.g. public JSON form). */
    imageUrlHelperText?: string;
    /** Softer section labels, spacing, and container styling for the public contribute flow. */
    publicFormEnhancements?: boolean;
}

const libraries = ['places'];
const LONG_DESCRIPTION_MAX_LENGTH = 500;
const PHONE_COUNTRY_OPTIONS = [
    { code: '+49', label: 'DE (+49)' },
    { code: '+43', label: 'AT (+43)' },
    { code: '+41', label: 'CH (+41)' },
    { code: '+31', label: 'NL (+31)' },
    { code: '+32', label: 'BE (+32)' },
    { code: '+33', label: 'FR (+33)' },
    { code: '+39', label: 'IT (+39)' },
    { code: '+34', label: 'ES (+34)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+1', label: 'US/CA (+1)' },
];

/** Prefer explicit props when they have entries; `[]` is truthy for `??` and must not block the service fallback. */
function resolveOptionList(prop: string[] | undefined, serviceList: string[]): string[] {
    if (prop && prop.length > 0) return prop;
    if (serviceList.length > 0) return serviceList;
    return prop ?? serviceList;
}

function formatLocationAuditLine(loc: Location): string | null {
    const parts: string[] = [];
    if (loc.createdByUsername) parts.push(`Created by ${loc.createdByUsername}`);
    if (loc.lastEditedByUsername) parts.push(`Last edited by ${loc.lastEditedByUsername}`);
    if (loc.recordUpdatedAt) {
        parts.push(`Updated ${new Date(loc.recordUpdatedAt).toLocaleString()}`);
    }
    return parts.length ? parts.join(' · ') : null;
}

function hasDescriptionLinks(text: string): boolean {
    if (!text.trim()) return false;
    const plainUrlRegex = /https?:\/\/[^\s)]+/i;
    const markdownUrlRegex = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i;
    return plainUrlRegex.test(text) || markdownUrlRegex.test(text);
}

function splitPhone(raw: string | undefined): { countryCode: string; number: string } {
    const value = (raw ?? '').trim();
    if (!value) return { countryCode: '+43', number: '' };
    const m = value.match(/^(\+\d{1,4})\s*(.*)$/);
    if (!m) return { countryCode: '+43', number: value };
    return { countryCode: m[1], number: m[2] ?? '' };
}

function isHttpUrl(value: string): boolean {
    return /^https?:\/\/.+/i.test(value);
}

function splitAdditionalLinks(value: string): string[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

export default function LocationForm({
    initialData,
    onSave,
    onCancel,
    sessionDraftKey,
    categoryOptions,
    tagOptions,
    formTitle,
    submitLabel,
    cancelLabel,
    disableImageUpload,
    imageUrlHelperText,
    publicFormEnhancements,
}: LocationFormProps) {
    /** Rounder corners to soften dense form UI */
    const fieldRadius = publicFormEnhancements ? 4.5 : 3;
    const iconAdornmentSx = { color: 'text.secondary' };

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: libraries as any,
    });

    const emptyFormData: Partial<Location> = React.useMemo(
        () => ({
            Name: '',
            Latitude: 0,
            Longitude: 0,
            Description: '',
            Website: '',
            Tags: '',
            Image: '',
            Address: '',
            Phone: '',
            Email: '',
            Instagram: '',
            Facebook: '',
            'Additional Links': [],
            Categories: [],
            'Contact Person': '',
            'Last Checked': new Date().toISOString().split('T')[0],
            'Additional Info': '',
        }),
        []
    );

    const sessionDraft = React.useMemo(() => {
        if (initialData != null || !sessionDraftKey) return null;
        return loadLocationFormDraft(sessionDraftKey);
    }, [initialData, sessionDraftKey]);

    const [formData, setFormData] = React.useState<Partial<Location>>(() => {
        if (initialData) {
            return {
                ...initialData,
                Instagram: initialData.Instagram ?? '',
                Facebook: initialData.Facebook ?? '',
                'Additional Links': initialData['Additional Links'] ?? [],
                Categories: initialData.Categories ?? [],
            };
        }
        if (sessionDraft?.formData) {
            return {
                ...emptyFormData,
                ...sessionDraft.formData,
                Instagram: sessionDraft.formData.Instagram ?? '',
                Facebook: sessionDraft.formData.Facebook ?? '',
                'Additional Links': sessionDraft.formData['Additional Links'] ?? [],
                Categories: sessionDraft.formData.Categories ?? [],
            };
        }
        return emptyFormData;
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<string[]>(() =>
        resolveOptionList(categoryOptions, LocationService.getCategories())
    );
    const [addressInput, setAddressInput] = useState(() => sessionDraft?.addressInput ?? '');
    const [addressOptions, setAddressOptions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [addressVerified, setAddressVerified] = useState(() => sessionDraft?.addressVerified ?? false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [availableTags, setAvailableTags] = useState<string[]>(() =>
        resolveOptionList(tagOptions, LocationService.getTags())
    );
    const [selectedTags, setSelectedTags] = useState<string[]>(() => sessionDraft?.selectedTags ?? []);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);
    const [showImageUrlInput, setShowImageUrlInput] = useState(false);
    const [descriptionInfoAnchorEl, setDescriptionInfoAnchorEl] = useState<HTMLElement | null>(null);
    const [phoneCountryCode, setPhoneCountryCode] = useState('+43');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Load categories on mount and when opening a different location (list may have changed)
    useEffect(() => {
        setCategories(resolveOptionList(categoryOptions, LocationService.getCategories()));
    }, [initialData, categoryOptions]);

    useEffect(() => {
        setAvailableTags(resolveOptionList(tagOptions, LocationService.getTags()));
    }, [tagOptions]);

    useEffect(() => {
        if (loadError) {
            Logger.error('Failed to load Google Maps script', loadError);
            setApiError('Failed to load Google Maps services. Please check your API key and enabled services.');
        }
    }, [loadError]);

    // Initialize selected tags when component mounts or initialData changes
    useEffect(() => {
        if (initialData?.Tags) {
            setSelectedTags(initialData.Tags.split(',').map(tag => tag.trim()).filter(Boolean));
        } else if (!sessionDraftKey) {
            setSelectedTags([]);
        }
    }, [initialData, sessionDraftKey]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                Instagram: initialData.Instagram ?? '',
                Facebook: initialData.Facebook ?? '',
                'Additional Links': initialData['Additional Links'] ?? [],
                Categories: initialData.Categories ?? [],
            });
            setAddressInput(initialData.Address || '');
            setAddressVerified(!!initialData.Address);
        } else if (!sessionDraftKey) {
            setFormData(emptyFormData);
            setAddressInput('');
            setAddressVerified(false);
        }
    }, [initialData, emptyFormData, sessionDraftKey]);

    useEffect(() => {
        const parsed = splitPhone(formData.Phone);
        setPhoneCountryCode(parsed.countryCode);
        setPhoneNumber(parsed.number);
    }, [initialData, sessionDraftKey]);

    /** Persist public contribute draft (sessionStorage: survives refresh, cleared when tab closes). */
    const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!sessionDraftKey || initialData != null) return;
        if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current);
        saveDraftTimeoutRef.current = setTimeout(() => {
            saveDraftTimeoutRef.current = null;
            saveLocationFormDraft(sessionDraftKey, {
                formData,
                addressInput,
                addressVerified,
                selectedTags,
            });
        }, 400);
        return () => {
            if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current);
        };
    }, [sessionDraftKey, initialData, formData, addressInput, addressVerified, selectedTags]);

    const handleTextChange = (field: keyof Location) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleAddressChange = async (value: string) => {
        setAddressInput(value);
        setApiError(null);
        
        if (!isLoaded) {
            Logger.warn('Attempted to use Places API before it was loaded');
            setApiError('Google Maps services are still loading...');
            return;
        }
        
        if (value) {
            try {
                Logger.info(`Fetching address predictions for: ${value}`);
                const autocomplete = new google.maps.places.AutocompleteService();
                const results = await autocomplete.getPlacePredictions({
                    input: value,
                });
                setAddressOptions(results?.predictions || []);
            } catch (error) {
                Logger.error('Error fetching address predictions', error);
                if (error instanceof Error) {
                    if (error.message.includes('REQUEST_DENIED')) {
                        setApiError('Places API is not enabled. Please enable it in the Google Cloud Console.');
                    } else if (error.message.includes('INVALID_REQUEST')) {
                        setApiError('Invalid request. Please check your input.');
                    } else {
                        setApiError(`Failed to get address suggestions: ${error.message}`);
                    }
                }
                setAddressOptions([]);
            }
        } else {
            setAddressOptions([]);
        }
    };

    const handleAddressSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
        if (!isLoaded) {
            Logger.warn('Attempted to use Places API before it was loaded');
            setApiError('Google Maps services are still loading...');
            return;
        }

        try {
            const geocoder = new google.maps.Geocoder();
            const result = await geocoder.geocode({ placeId: prediction.place_id });
            
            if (result.results && result.results.length > 0) {
                const location = result.results[0].geometry.location;
                setAddressInput(prediction.description);
                setFormData({
                    ...formData,
                    Address: prediction.description,
                    Latitude: location.lat(),
                    Longitude: location.lng(),
                });
                setAddressVerified(true);
            }
        } catch (error) {
            Logger.error('Error geocoding selected address', error);
            setApiError('Failed to get location details for the selected address.');
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        
        // Required fields validation
        if (!formData.Name?.trim()) {
            errors.Name = 'Name is required';
        }
        if (!formData.Website?.trim()) {
            errors.Website = 'Website is required';
        }
        if (!formData.Address?.trim()) {
            errors.Address = 'Address is required';
        }
        if (!formData['Contact Person']?.trim()) {
            errors['Contact Person'] = 'Contact Person is required';
        }
        if (!formData.Categories?.length) {
            errors.Categories = 'At least one category is required';
        }
        if (!formData['Additional Info']?.trim()) {
            errors['Additional Info'] = 'Description is required';
        }
        const shortDesc = formData.Description ?? '';
        if (shortDesc.length > 100) {
            errors.Description = 'Short Description must be 100 characters or less';
        }
        const longDesc = formData['Additional Info'] ?? '';
        if (longDesc.length > LONG_DESCRIPTION_MAX_LENGTH) {
            errors['Additional Info'] = `Description must be ${LONG_DESCRIPTION_MAX_LENGTH} characters or less`;
        }

        // Phone or Email validation
        if (!formData.Phone?.trim() && !formData.Email?.trim()) {
            errors.Phone = 'Either Phone or Email is required';
            errors.Email = 'Either Phone or Email is required';
        }

        // Website format validation
        if (formData.Website && !isHttpUrl(formData.Website)) {
            errors.Website = 'Website must start with http:// or https://';
        }

        if (formData.Instagram && !isHttpUrl(formData.Instagram)) {
            errors.Instagram = 'Instagram must start with http:// or https://';
        }
        if (formData.Facebook && !isHttpUrl(formData.Facebook)) {
            errors.Facebook = 'Facebook must start with http:// or https://';
        }
        const invalidAdditionalLink = (formData['Additional Links'] ?? []).find((link) => !isHttpUrl(link));
        if (invalidAdditionalLink) {
            errors['Additional Links'] = 'All additional links must start with http:// or https://';
        }

        // Email format validation if provided
        if (formData.Email && !formData.Email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errors.Email = 'Invalid email format';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (validateForm()) {
            const updatedData = {
                ...formData,
                Categories: [...(formData.Categories ?? [])],
                'Last Checked': new Date().toISOString().split('T')[0],
            };

            onSave(updatedData as Location);
            if (sessionDraftKey) {
                clearLocationFormDraft(sessionDraftKey);
            }
        }
    };

    const verifyLocation = () => {
        if (formData.Latitude && formData.Longitude) {
            window.open(
                `https://www.google.com/maps?q=${formData.Latitude},${formData.Longitude}`,
                '_blank'
            );
        }
    };

    const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImageUploadError(null);
        setIsUploadingImage(true);

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `locations/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('location-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('location-images').getPublicUrl(filePath);
            if (!data?.publicUrl) {
                throw new Error('Could not get public URL for image.');
            }

            setFormData(prev => ({ ...prev, Image: data.publicUrl }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload image.';
            setImageUploadError(message);
        } finally {
            setIsUploadingImage(false);
            // allow re-upload of same file name
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    const updatePhone = (countryCode: string, number: string) => {
        const cleanNumber = number.trim();
        setFormData((prev) => ({
            ...prev,
            Phone: cleanNumber ? `${countryCode} ${cleanNumber}` : '',
        }));
    };

    const auditSubtitle = initialData?.ID ? formatLocationAuditLine(initialData) : null;
    const isDescriptionInfoOpen = Boolean(descriptionInfoAnchorEl);
    const shouldShowDescriptionPreview = hasDescriptionLinks(formData['Additional Info'] ?? '');

    const sectionHeadingSx = publicFormEnhancements
        ? {
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.02em',
              color: 'rgba(15,23,42,0.88)',
              mb: 2,
              pl: 1.25,
              borderLeft: '3px solid',
              borderColor: 'primary.main',
          }
        : {
              fontWeight: 600,
              fontSize: 14,
              mb: 1.5,
          };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: fieldRadius,
                },
            }}
        >
            <DialogTitle sx={publicFormEnhancements ? { px: 0, pt: 0, pb: 2.5 } : undefined}>
                <Typography
                    variant="h6"
                    component="div"
                    sx={
                        publicFormEnhancements
                            ? { fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.2rem' }
                            : undefined
                    }
                >
                    {formTitle ?? (initialData ? 'Edit Location' : 'Add New Location')}
                </Typography>
                {auditSubtitle && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                        sx={{ mt: 0.75, lineHeight: 1.4 }}
                    >
                        {auditSubtitle}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent sx={publicFormEnhancements ? { pt: 2.5, px: { xs: 1, sm: 2 } } : undefined}>
                <Box
                    sx={{
                        p: publicFormEnhancements ? 2 : 1,
                        borderRadius: publicFormEnhancements ? 3 : 0,
                        bgcolor: publicFormEnhancements ? 'rgba(255,255,255,0.55)' : 'transparent',
                        border: 'none',
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{
                            ...sectionHeadingSx,
                            ...(publicFormEnhancements ? { mt: 0 } : { mt: 1 }),
                        }}
                    >
                        1. Basic information
                    </Typography>
                    <Grid container spacing={publicFormEnhancements ? 2.5 : 2}>
                        <Grid item xs={12}>
                            <TextField
                                size="small"
                                required
                                fullWidth
                                label="Name"
                                value={formData.Name}
                                onChange={handleTextChange('Name')}
                                error={!!formErrors.Name}
                                helperText={formErrors.Name}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, height: 40 } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                size="small"
                                required
                                fullWidth
                                label="Website"
                                value={formData.Website}
                                onChange={handleTextChange('Website')}
                                error={!!formErrors.Website}
                                helperText={formErrors.Website}
                                placeholder="https://example.org"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment
                                            position="start"
                                            sx={iconAdornmentSx}
                                        >
                                            <WebsiteFieldIcon className="w-4 h-4" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, height: 40 } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Short Description"
                                value={formData.Description}
                                onChange={handleTextChange('Description')}
                                multiline
                                rows={2}
                                inputProps={{ maxLength: 100 }}
                                error={!!formErrors.Description}
                                helperText={
                                    formErrors.Description ||
                                    `${(formData.Description ?? '').length}/100`
                                }
                                placeholder="Optional teaser (max 100 characters)"
                                slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                size="small"
                                fullWidth
                                multiline
                                rows={5}
                                required
                                label="Description"
                                value={formData['Additional Info']}
                                onChange={handleTextChange('Additional Info')}
                                inputProps={{ maxLength: LONG_DESCRIPTION_MAX_LENGTH }}
                                error={!!formErrors['Additional Info']}
                                helperText={
                                    formErrors['Additional Info'] ||
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box component="span">
                                            {(formData['Additional Info'] ?? '').length}/{LONG_DESCRIPTION_MAX_LENGTH}
                                        </Box>
                                        <IconButton
                                            size="small"
                                            aria-label="Description formatting help"
                                            onClick={(event) => setDescriptionInfoAnchorEl(event.currentTarget)}
                                            sx={{
                                                p: 0,
                                                width: '0.9rem',
                                                height: '0.9rem',
                                                fontSize: '0.75rem',
                                                color: 'text.secondary',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <InfoFieldIcon className="w-3.5 h-3.5" />
                                        </IconButton>
                                    </Box>
                                }
                                placeholder="Full description of the location"
                                slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                            />
                            <Popover
                                open={isDescriptionInfoOpen}
                                anchorEl={descriptionInfoAnchorEl}
                                onClose={() => setDescriptionInfoAnchorEl(null)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                            >
                                <Box sx={{ p: 1.5, maxWidth: 340 }}>
                                    <Typography variant="body2">
                                        Paste https:// links or use [link text](https://...). Preview below
                                        shows how links appear.
                                    </Typography>
                                </Box>
                            </Popover>
                            {shouldShowDescriptionPreview && (
                                <Box
                                    sx={{
                                        mt: 1.5,
                                        p: 1.5,
                                        borderRadius: fieldRadius,
                                        bgcolor: 'grey.50',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        minHeight: 48,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}
                                    >
                                        Preview
                                    </Typography>
                                    <LinkifiedDescription text={formData['Additional Info'] ?? ''} />
                                </Box>
                            )}
                        </Grid>
                        <Grid item xs={12}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: fieldRadius,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'rgba(148,163,184,0.06)',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mb: 1, fontWeight: 700, letterSpacing: '0.01em' }}
                                >
                                    Logo
                                </Typography>
                                <Grid container spacing={1.25} alignItems="center">
                                {!disableImageUpload && (
                                    <Grid item xs={12}>
                                        <Grid container spacing={1}>
                                            <Grid item xs={12} sm={formData.Image?.trim() ? 8 : 12}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    component="label"
                                                    fullWidth
                                                    disabled={isUploadingImage}
                                                    sx={{ height: 40, borderRadius: fieldRadius, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                                                >
                                                    {isUploadingImage ? 'Uploading…' : 'Upload logo'}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        hidden
                                                        onChange={handleImageFileChange}
                                                    />
                                                </Button>
                                            </Grid>
                                            {formData.Image?.trim() && (
                                                <Grid item xs={12} sm={4}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        fullWidth
                                                        onClick={() => setFormData((prev) => ({ ...prev, Image: '' }))}
                                                        sx={{ height: 40, borderRadius: fieldRadius, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                                                    >
                                                        Remove logo
                                                    </Button>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Grid>
                                )}
                                <Grid item xs={12}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setShowImageUrlInput((prev) => !prev)}
                                        sx={{
                                            px: 0,
                                            minWidth: 0,
                                            textTransform: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {showImageUrlInput ? 'Hide direct logo URL' : 'Use direct logo URL'}
                                    </Button>
                                    <Collapse in={showImageUrlInput}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            label="Direct logo URL"
                                            value={formData.Image}
                                            onChange={handleTextChange('Image')}
                                            placeholder="https://example.org/photo.jpg"
                                            helperText={imageUrlHelperText}
                                            slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                                            sx={{
                                                mt: 0.75,
                                                '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, height: 40 },
                                            }}
                                        />
                                    </Collapse>
                                </Grid>
                                {imageUploadError && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="error">
                                            {imageUploadError}
                                        </Typography>
                                    </Grid>
                                )}
                                {formData.Image?.trim() && (
                                    <Grid item xs={12}>
                                        <Box
                                            sx={{
                                                mt: 0.5,
                                                p: 1.25,
                                                borderRadius: fieldRadius,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'background.paper',
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                                            >
                                                Logo preview
                                            </Typography>
                                            <Box
                                                component="img"
                                                src={formData.Image}
                                                alt={formData.Name?.trim() || 'Location preview'}
                                                sx={{
                                                    width: '100%',
                                                    height: 180,
                                                    objectFit: 'contain',
                                                    objectPosition: 'center',
                                                    borderRadius: fieldRadius,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    bgcolor: 'common.white',
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: fieldRadius,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'rgba(148,163,184,0.06)',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mb: 1, fontWeight: 700, letterSpacing: '0.01em' }}
                                >
                                    Social & extra links
                                </Typography>
                                <Grid container spacing={publicFormEnhancements ? 2.5 : 2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            label="Instagram"
                                            value={formData.Instagram}
                                            onChange={handleTextChange('Instagram')}
                                            error={!!formErrors.Instagram}
                                            helperText={formErrors.Instagram}
                                            placeholder="https://instagram.com/..."
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment
                                                        position="start"
                                                        sx={iconAdornmentSx}
                                                    >
                                                        <InstagramIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            label="Facebook"
                                            value={formData.Facebook}
                                            onChange={handleTextChange('Facebook')}
                                            error={!!formErrors.Facebook}
                                            helperText={formErrors.Facebook}
                                            placeholder="https://facebook.com/..."
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment
                                                        position="start"
                                                        sx={iconAdornmentSx}
                                                    >
                                                        <FacebookIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Additional links"
                                            value={(formData['Additional Links'] ?? []).join('\n')}
                                            onChange={(event) => {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    'Additional Links': splitAdditionalLinks(event.target.value),
                                                }));
                                            }}
                                            error={!!formErrors['Additional Links']}
                                            helperText={formErrors['Additional Links'] || 'One URL per line'}
                                            placeholder={'https://example.org/link-1\nhttps://example.org/link-2'}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment
                                                        position="start"
                                                        sx={{ ...iconAdornmentSx, alignSelf: 'flex-start', mt: 1 }}
                                                    >
                                                        <WebsiteFieldIcon className="w-4 h-4" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>

                    <Typography
                        variant="subtitle1"
                        sx={{
                            ...sectionHeadingSx,
                            ...(publicFormEnhancements ? { mt: 4 } : { mt: 3 }),
                        }}
                    >
                        2. Contact & address
                    </Typography>
                    <Grid container spacing={0}>
                        {apiError && (
                            <Grid item xs={12}>
                                <Alert 
                                    severity="error" 
                                    sx={{ mb: 2 }}
                                    action={
                                        <Button
                                            color="inherit"
                                            size="small"
                                            href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Enable API
                                        </Button>
                                    }
                                >
                                    <AlertTitle>Error</AlertTitle>
                                    {apiError}
                                </Alert>
                            </Grid>
                        )}
                        {!isLoaded && (
                            <Grid item xs={12}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Loading Google Maps services...
                                </Alert>
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <Autocomplete
                                freeSolo
                                options={addressOptions}
                                getOptionLabel={(option) => 
                                    typeof option === 'string' ? option : option.description
                                }
                                value={null}
                                inputValue={addressInput}
                                onInputChange={(_, value) => {
                                    handleAddressChange(value);
                                    setAddressVerified(false);
                                }}
                                onChange={(_, value) => {
                                    if (value === null) {
                                        setFormData({ ...formData, Address: '' });
                                        setAddressInput('');
                                        setAddressVerified(false);
                                    } else if (typeof value === 'string') {
                                        setFormData({ ...formData, Address: value });
                                        setAddressInput(value);
                                        setAddressVerified(false);
                                    } else {
                                        handleAddressSelect(value);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        size="small"
                                        {...params}
                                        label="Address"
                                        fullWidth
                                        required
                                        error={!!formErrors.Address}
                                        helperText={formErrors.Address}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment
                                                    position="start"
                                                    sx={iconAdornmentSx}
                                                >
                                                    <PlaceFieldIcon className="w-4 h-4" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, height: 40 } }}
                                    />
                                )}
                            />
                        </Grid>
                        {addressVerified && (
                            <Grid item xs={12}>
                                <Box 
                                    sx={{ 
                                        bgcolor: 'background.paper',
                                        pt: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <Box sx={{ 
                                        display: 'flex', 
                                        gap: 4, 
                                        flex: 1,
                                        minWidth: '200px',
                                        fontStyle: 'italic',
                                        color: '#9e9e9e'
                                    }}>
                                        <Typography sx={{ fontStyle: 'italic', color: '#9e9e9e' }}>
                                            Latitude: {formData.Latitude}
                                        </Typography>
                                        <Typography sx={{ fontStyle: 'italic', color: '#9e9e9e' }}>
                                            Longitude: {formData.Longitude}
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<MapFieldIcon className="w-4 h-4" />}
                                        onClick={verifyLocation}
                                        sx={{ 
                                            minWidth: 180,
                                            height: 40,
                                            bgcolor: 'primary.light',
                                            '&:hover': {
                                                bgcolor: 'primary.dark',
                                            }
                                        }}
                                    >
                                        View on Google Maps
                                    </Button>
                                </Box>
                            </Grid>
                        )}
                    </Grid>

                    <Grid container spacing={publicFormEnhancements ? 2.5 : 2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Grid container spacing={1}>
                                <Grid item xs={5}>
                                    <FormControl
                                        fullWidth
                                        size="small"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, height: 40 } }}
                                    >
                                        <InputLabel id="phone-country-code-label">Code</InputLabel>
                                        <Select
                                            labelId="phone-country-code-label"
                                            value={phoneCountryCode}
                                            label="Code"
                                            onChange={(e: SelectChangeEvent<string>) => {
                                                const newCode = e.target.value;
                                                setPhoneCountryCode(newCode);
                                                updatePhone(newCode, phoneNumber);
                                            }}
                                            startAdornment={
                                                <InputAdornment
                                                    position="start"
                                                    sx={{ ml: -0.25, mr: 0.25, ...iconAdornmentSx }}
                                                >
                                                    <PhoneFieldIcon className="w-4 h-4" />
                                                </InputAdornment>
                                            }
                                        >
                                            {PHONE_COUNTRY_OPTIONS.map((option) => (
                                                <MenuItem key={option.code} value={option.code}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={7}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        label="Phone number"
                                        value={phoneNumber}
                                        onChange={(event) => {
                                            const number = event.target.value;
                                            setPhoneNumber(number);
                                            updatePhone(phoneCountryCode, number);
                                        }}
                                        error={!!formErrors.Phone}
                                        helperText={formErrors.Phone || (phoneNumber.trim() ? `Saved as: ${phoneCountryCode} ${phoneNumber.trim()}` : '')}
                                        slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.Email}
                                onChange={handleTextChange('Email')}
                                error={!!formErrors.Email}
                                helperText={formErrors.Email}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment
                                            position="start"
                                            sx={iconAdornmentSx}
                                        >
                                            <EmailFieldIcon className="w-4 h-4" />
                                        </InputAdornment>
                                    ),
                                }}
                                slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                size="small"
                                required
                                fullWidth
                                label="Contact Person"
                                value={formData['Contact Person']}
                                onChange={handleTextChange('Contact Person')}
                                error={!!formErrors['Contact Person']}
                                helperText={formErrors['Contact Person']}
                                slotProps={{ input: { sx: { borderRadius: fieldRadius } } }}
                            />
                        </Grid>
                    </Grid>

                    <Typography
                        variant="subtitle1"
                        sx={{
                            ...sectionHeadingSx,
                            ...(publicFormEnhancements ? { mt: 4 } : { mt: 3 }),
                        }}
                    >
                        3. Categories & tags
                    </Typography>
                    <Grid container spacing={publicFormEnhancements ? 2.5 : 2}>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                size="small"
                                options={categories}
                                value={formData.Categories ?? []}
                                onChange={(_, values) => {
                                    const prev = formData.Categories ?? [];
                                    const prevMain = prev[0];
                                    const next = values;
                                    if (next.length === 0) {
                                        setFormData({ ...formData, Categories: [] });
                                        return;
                                    }
                                    if (prevMain && next.includes(prevMain)) {
                                        setFormData({
                                            ...formData,
                                            Categories: [prevMain, ...next.filter((c) => c !== prevMain)],
                                        });
                                    } else {
                                        setFormData({ ...formData, Categories: next });
                                    }
                                }}
                                isOptionEqualToValue={(a, b) => a === b}
                                disableCloseOnSelect
                                limitTags={4}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Categories"
                                        placeholder="Choose one or more categories…"
                                        error={!!formErrors.Categories}
                                        helperText={formErrors.Categories}
                                        InputLabelProps={{
                                            ...params.InputLabelProps,
                                            required: true,
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, minHeight: 40 },
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl
                                fullWidth
                                size="small"
                                disabled={!(formData.Categories?.length)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, height: 40 } }}
                            >
                                <InputLabel id="primary-category-label">Primary category</InputLabel>
                                <Select
                                    labelId="primary-category-label"
                                    value={formData.Categories?.[0] ?? ''}
                                    label="Primary category"
                                    onChange={(e: SelectChangeEvent<string>) => {
                                        const main = e.target.value;
                                        const rest = (formData.Categories ?? []).filter((c) => c !== main);
                                        setFormData({ ...formData, Categories: [main, ...rest] });
                                    }}
                                >
                                    {(formData.Categories ?? []).map((c) => (
                                        <MenuItem key={c} value={c}>
                                            {c}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                size="small"
                                options={availableTags}
                                value={selectedTags}
                                disableCloseOnSelect
                                limitTags={2}
                                onChange={(_, values) => {
                                    setSelectedTags(values);
                                    setFormData((prev) => ({ ...prev, Tags: values.join(', ') }));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Tags"
                                        placeholder="Search tags…"
                                        sx={{
                                            '& .MuiOutlinedInput-root': { borderRadius: fieldRadius, minHeight: 40 },
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            {!publicFormEnhancements && <Divider />}
            <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'flex-end' }}>
                {onCancel && (
                    <Button onClick={onCancel} variant="outlined" size="small" sx={{ borderRadius: 999 }}>
                        {cancelLabel ?? 'Cancel'}
                    </Button>
                )}
                <Button type="submit" variant="contained" size="small" sx={{ borderRadius: 999 }}>
                    {submitLabel ?? (initialData ? 'Save Changes' : 'Create Location')}
                </Button>
            </DialogActions>

        </Box>
    );
} 