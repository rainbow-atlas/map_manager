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
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    SelectChangeEvent,
    Alert,
    AlertTitle,
    Chip,
} from '@mui/material';
import {
    Language as WebsiteIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Place as PlaceIcon,
    LocalOffer as TagIcon,
    Add as AddIcon,
    Map as MapIcon,
} from '@mui/icons-material';
import { Location } from '../types/Location';
import { LocationService } from '../services/LocationService';
import { Autocomplete } from '@mui/material';
import { useLoadScript } from '@react-google-maps/api';
import Logger from '../utils/logger';

interface LocationFormProps {
    initialData: Location | null;
    onSave: (location: Location) => void;
    onCancel: () => void;
}

const libraries = ['places'];

export default function LocationForm({ initialData, onSave, onCancel }: LocationFormProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: libraries as any,
    });

    const [formData, setFormData] = React.useState<Partial<Location>>(
        initialData || {
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
            Category: '',
            'Contact Person': '',
            'Last Checked': new Date().toISOString().split('T')[0],
            'Additional Info': '',
        }
    );

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [addressInput, setAddressInput] = useState('');
    const [addressOptions, setAddressOptions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [addressVerified, setAddressVerified] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTag, setNewTag] = useState('');

    // Load categories when component mounts
    useEffect(() => {
        setCategories(LocationService.getCategories());
    }, []);

    useEffect(() => {
        // Load available tags from the Tags worksheet
        setAvailableTags(LocationService.getTags());
    }, []);

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
        } else {
            setSelectedTags([]);
        }
    }, [initialData]);

    const handleTextChange = (field: keyof Location) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleSelectChange = (field: keyof Location) => (
        event: SelectChangeEvent
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

    const handleTagsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newTags = event.target.value.split(',').map(tag => tag.trim());
        
        // Validate that all tags exist in the Tags worksheet
        const invalidTags = newTags.filter(tag => tag && !availableTags.includes(tag));
        if (invalidTags.length > 0) {
            setError(`Invalid tags: ${invalidTags.join(', ')}. Please use only existing tags.`);
            return;
        }
        
        setError(null);
        handleTextChange('Tags')(event);
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
        if (!formData.Category?.trim()) {
            errors.Category = 'Category is required';
        }

        // Phone or Email validation
        if (!formData.Phone?.trim() && !formData.Email?.trim()) {
            errors.Phone = 'Either Phone or Email is required';
            errors.Email = 'Either Phone or Email is required';
        }

        // Website format validation
        if (formData.Website && !formData.Website.match(/^https?:\/\/.+/)) {
            errors.Website = 'Website must start with http:// or https://';
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
                'Last Checked': new Date().toISOString().split('T')[0],
            };

            // If there's a new category, add it to the service
            if (formData.Category && !categories.includes(formData.Category)) {
                await LocationService.addCategory(formData.Category);
                setCategories(LocationService.getCategories());
            }

            onSave(updatedData as Location);
        }
    };

    const handleAddCategory = async () => {
        if (newCategory && !categories.includes(newCategory)) {
            await LocationService.addCategory(newCategory);
            setCategories(LocationService.getCategories());
            setFormData({ ...formData, Category: newCategory });
            setNewCategory('');
        }
        setIsAddingCategory(false);
    };

    const verifyLocation = () => {
        if (formData.Latitude && formData.Longitude) {
            window.open(
                `https://www.google.com/maps?q=${formData.Latitude},${formData.Longitude}`,
                '_blank'
            );
        }
    };

    const handleAddTag = async () => {
        if (newTag && !availableTags.includes(newTag)) {
            await LocationService.addTag(newTag);
            setAvailableTags(LocationService.getTags());
            const updatedTags = [...selectedTags, newTag];
            setSelectedTags(updatedTags);
            setFormData(prev => ({ ...prev, Tags: updatedTags.join(', ') }));
            setNewTag('');
        }
        setIsAddingTag(false);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <DialogTitle>
                <Typography variant="h6" component="div">
                    {initialData ? 'Edit Location' : 'Add New Location'}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
                        Basic Information
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Name"
                                value={formData.Name}
                                onChange={handleTextChange('Name')}
                                error={!!formErrors.Name}
                                helperText={formErrors.Name}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required error={!!formErrors.Category}>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.Category}
                                    onChange={handleSelectChange('Category')}
                                    label="Category"
                                >
                                    {categories.map((category) => (
                                        <MenuItem key={category} value={category}>
                                            {category}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {formErrors.Category && (
                                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                                        {formErrors.Category}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Button
                                startIcon={<AddIcon />}
                                onClick={() => setIsAddingCategory(true)}
                                variant="outlined"
                                fullWidth
                                sx={{ height: '56px' }}
                            >
                                Add New Category
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Website"
                                value={formData.Website}
                                onChange={handleTextChange('Website')}
                                error={!!formErrors.Website}
                                helperText={formErrors.Website}
                                placeholder="https://"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <WebsiteIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.Description}
                                onChange={handleTextChange('Description')}
                                multiline
                                rows={3}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Image URL"
                                value={formData.Image}
                                onChange={handleTextChange('Image')}
                                placeholder="https://"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Add Tag</InputLabel>
                                    <Select
                                        value=""
                                        onChange={(event) => {
                                            const newTag = event.target.value;
                                            if (newTag && !selectedTags.includes(newTag)) {
                                                const updatedTags = [...selectedTags, newTag];
                                                setSelectedTags(updatedTags);
                                                setFormData(prev => ({ ...prev, Tags: updatedTags.join(', ') }));
                                            }
                                        }}
                                        label="Add Tag"
                                        startAdornment={
                                            <InputAdornment position="start">
                                                <TagIcon />
                                            </InputAdornment>
                                        }
                                    >
                                        {availableTags.map((tag) => (
                                            <MenuItem key={tag} value={tag}>
                                                {tag}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => setIsAddingTag(true)}
                                    variant="outlined"
                                    sx={{ minWidth: '180px', height: '56px' }}
                                >
                                    Add New Tag
                                </Button>
                            </Box>
                        </Grid>
                        {selectedTags.length > 0 && (
                            <Grid item xs={12}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: 1, 
                                    mt: 1,
                                    p: 2,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}>
                                    {selectedTags.map((tag, index) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            onDelete={() => {
                                                const newTags = selectedTags.filter((_, i) => i !== index);
                                                setSelectedTags(newTags);
                                                setFormData(prev => ({ ...prev, Tags: newTags.join(', ') }));
                                            }}
                                            color="primary"
                                            size="small"
                                        />
                                    ))}
                                </Box>
                            </Grid>
                        )}
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                        Location Details
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
                                value={formData.Address}
                                inputValue={addressInput}
                                onInputChange={(_, value) => {
                                    handleAddressChange(value);
                                    setAddressVerified(false);
                                }}
                                onChange={(_, value) => {
                                    if (value === null) {
                                        setFormData({ ...formData, Address: '' });
                                        setAddressVerified(false);
                                    } else if (typeof value === 'string') {
                                        setFormData({ ...formData, Address: value });
                                        setAddressVerified(false);
                                    } else {
                                        handleAddressSelect(value);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Address"
                                        fullWidth
                                        required
                                        error={!!formErrors.Address}
                                        helperText={formErrors.Address}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PlaceIcon />
                                                </InputAdornment>
                                            ),
                                        }}
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
                                        variant="contained"
                                        startIcon={<MapIcon />}
                                        onClick={verifyLocation}
                                        sx={{ 
                                            minWidth: '200px',
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

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                        Contact Information
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Phone"
                                value={formData.Phone}
                                onChange={handleTextChange('Phone')}
                                error={!!formErrors.Phone}
                                helperText={formErrors.Phone}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PhoneIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.Email}
                                onChange={handleTextChange('Email')}
                                error={!!formErrors.Email}
                                helperText={formErrors.Email}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Contact Person"
                                value={formData['Contact Person']}
                                onChange={handleTextChange('Contact Person')}
                                error={!!formErrors['Contact Person']}
                                helperText={formErrors['Contact Person']}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                        Additional Information
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Additional Info"
                                value={formData['Additional Info']}
                                onChange={handleTextChange('Additional Info')}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={onCancel} variant="outlined">
                    Cancel
                </Button>
                <Button type="submit" variant="contained">
                    {initialData ? 'Save Changes' : 'Create Location'}
                </Button>
            </DialogActions>

            {/* Dialog for adding new category */}
            <Dialog open={isAddingCategory} onClose={() => setIsAddingCategory(false)}>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Category Name"
                        fullWidth
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                    <Button onClick={handleAddCategory} variant="contained">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog for adding new tag */}
            <Dialog open={isAddingTag} onClose={() => setIsAddingTag(false)}>
                <DialogTitle>Add New Tag</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tag Name"
                        fullWidth
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddingTag(false)}>Cancel</Button>
                    <Button onClick={handleAddTag} variant="contained">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
} 