import React from 'react';
import {
    Box,
    TextField,
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
} from '@mui/material';
import { Location } from '../types/Location';

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

    const handleChange = (field: keyof Location) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSave(formData as Location);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <DialogTitle>
                {initialData ? 'Edit Location' : 'Add New Location'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            required
                            fullWidth
                            label="Name"
                            value={formData.Name}
                            onChange={handleChange('Name')}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            required
                            fullWidth
                            type="number"
                            label="Latitude"
                            value={formData.Latitude}
                            onChange={handleChange('Latitude')}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            required
                            fullWidth
                            type="number"
                            label="Longitude"
                            value={formData.Longitude}
                            onChange={handleChange('Longitude')}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={formData.Description}
                            onChange={handleChange('Description')}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Website"
                            value={formData.Website}
                            onChange={handleChange('Website')}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Tags"
                            value={formData.Tags}
                            onChange={handleChange('Tags')}
                            helperText="Separate tags with commas"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Image URL"
                            value={formData.Image}
                            onChange={handleChange('Image')}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Address"
                            value={formData.Address}
                            onChange={handleChange('Address')}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Phone"
                            value={formData.Phone}
                            onChange={handleChange('Phone')}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={formData.Email}
                            onChange={handleChange('Email')}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Category"
                            value={formData.Category}
                            onChange={handleChange('Category')}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Contact Person"
                            value={formData['Contact Person']}
                            onChange={handleChange('Contact Person')}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Last Checked"
                            type="date"
                            value={formData['Last Checked']}
                            onChange={handleChange('Last Checked')}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Additional Info"
                            value={formData['Additional Info']}
                            onChange={handleChange('Additional Info')}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="contained">Save</Button>
            </DialogActions>
        </Box>
    );
} 