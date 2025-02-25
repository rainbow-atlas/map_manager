import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    Language as WebsiteIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Place as PlaceIcon,
    LocalOffer as TagIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { Location } from '../types/Location';
import { LocationService } from '../services/LocationService';

interface LocationFormProps {
    initialData: Location | null;
    onSave: (location: Location) => void;
    onCancel: () => void;
}

export default function LocationForm({ initialData, onSave, onCancel }: LocationFormProps) {
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

    // Load categories when component mounts
    useEffect(() => {
        setCategories(LocationService.getCategories());
    }, []);

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

    const openInMaps = () => {
        if (formData.Latitude && formData.Longitude) {
            window.open(
                `https://www.google.com/maps?q=${formData.Latitude},${formData.Longitude}`,
                '_blank'
            );
        }
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
                            <TextField
                                fullWidth
                                label="Tags"
                                value={formData.Tags}
                                onChange={handleTextChange('Tags')}
                                helperText="Separate tags with commas"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <TagIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                        Location Details
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Address"
                                value={formData.Address}
                                onChange={handleTextChange('Address')}
                                error={!!formErrors.Address}
                                helperText={formErrors.Address}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PlaceIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                type="number"
                                label="Latitude"
                                value={formData.Latitude}
                                onChange={handleTextChange('Latitude')}
                                inputProps={{ step: 'any' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                type="number"
                                label="Longitude"
                                value={formData.Longitude}
                                onChange={handleTextChange('Longitude')}
                                inputProps={{ step: 'any' }}
                                InputProps={{
                                    endAdornment: formData.Latitude && formData.Longitude && (
                                        <InputAdornment position="end">
                                            <IconButton onClick={openInMaps} size="small">
                                                <PlaceIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
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
        </Box>
    );
} 