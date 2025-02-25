import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Alert,
    Button,
} from '@mui/material';
import { LocationService } from '../services/LocationService';
import LocationForm from './LocationForm';
import { Location } from '../types/Location';
import {
    SaveOutlined,
    ArrowBackOutlined,
} from '@mui/icons-material';

export default function CreateLocationPage() {
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | null>(null);

    const handleSave = async (location: Location) => {
        try {
            await LocationService.addLocation(location);
            navigate('/locations');
        } catch (err) {
            setError('Failed to create location. Please try again.');
            console.error('Error creating location:', err);
        }
    };

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Create New Location
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ mt: 2, p: 3 }}>
                <LocationForm
                    initialData={null}
                    onSave={handleSave}
                    onCancel={() => navigate('/locations')}
                />
            </Paper>

            <Button
                variant="outlined"
                startIcon={<ArrowBackOutlined />}
                onClick={() => navigate('/locations')}
            >
                Back to Locations
            </Button>

            <Button
                type="submit"
                variant="contained"
                startIcon={<SaveOutlined />}
            >
                Save Location
            </Button>
        </Box>
    );
} 