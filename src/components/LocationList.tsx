import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    IconButton,
    Box,
    Button,
    Dialog,
    CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Location } from '../types/Location';
import { LocationService } from '../services/LocationService';
import LocationForm from './LocationForm';

export default function LocationList() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editLocation, setEditLocation] = useState<Location | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadLocations = async () => {
        setIsLoading(true);
        try {
            await LocationService.refreshData();
            setLocations(LocationService.getAllLocations());
        } catch (error) {
            console.error('Error loading locations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLocations();
    }, []);

    useEffect(() => {
        const filtered = locations.filter(location =>
            Object.values(location).some(value =>
                value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        setFilteredLocations(filtered);
    }, [searchTerm, locations]);

    const handleEdit = (location: Location) => {
        setEditLocation(location);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this location?')) {
            setIsLoading(true);
            try {
                await LocationService.deleteLocation(id);
                await loadLocations();
            } catch (error) {
                console.error('Error deleting location:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSave = async (location: Location) => {
        setIsLoading(true);
        try {
            if (editLocation) {
                await LocationService.updateLocation(editLocation.ID, location);
            } else {
                await LocationService.addLocation(location);
            }
            await loadLocations();
        } catch (error) {
            console.error('Error saving location:', error);
        } finally {
            setIsLoading(false);
            setIsFormOpen(false);
            setEditLocation(null);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    label="Search"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ flexGrow: 1 }}
                />
                <Button variant="contained" onClick={() => setIsFormOpen(true)}>
                    Add New Location
                </Button>
                <IconButton onClick={loadLocations} disabled={isLoading}>
                    <RefreshIcon />
                </IconButton>
            </Box>

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell>Tags</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLocations.map((location) => (
                                <TableRow key={location.ID}>
                                    <TableCell>{location.Name}</TableCell>
                                    <TableCell>{location.Category}</TableCell>
                                    <TableCell>{location.Address}</TableCell>
                                    <TableCell>{location.Tags}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => handleEdit(location)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(location.ID)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

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
        </Box>
    );
} 