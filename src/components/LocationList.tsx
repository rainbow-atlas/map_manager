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
    Typography,
    Card,
    InputAdornment,
    Chip,
    Tooltip,
    Alert,
    TablePagination,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Add as AddIcon,
    Link as LinkIcon,
    Place as PlaceIcon,
} from '@mui/icons-material';
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
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const loadLocations = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await LocationService.refreshData();
            setLocations(LocationService.getAllLocations());
        } catch (error) {
            setError('Failed to load locations. Please try again.');
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
                value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        setFilteredLocations(filtered);
        setPage(0);
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
                setError('Failed to delete location. Please try again.');
                console.error('Error deleting location:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSave = async (location: Location) => {
        setIsLoading(true);
        setError(null);
        try {
            if (editLocation) {
                await LocationService.updateLocation(editLocation.ID, location);
            } else {
                await LocationService.addLocation(location);
            }
            await loadLocations();
            setIsFormOpen(false);
            setEditLocation(null);
        } catch (error) {
            setError('Failed to save location. Please try again.');
            console.error('Error saving location:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const openInMaps = (latitude: number, longitude: number) => {
        window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    };

    return (
        <Card>
            <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                        Locations
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Search locations"
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ flexGrow: 1 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setIsFormOpen(true)}
                        >
                            Add Location
                        </Button>
                        <Tooltip title="Refresh data">
                            <IconButton
                                onClick={loadLocations}
                                disabled={isLoading}
                                color="primary"
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Tags</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredLocations
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((location) => (
                                            <TableRow key={location.ID} hover>
                                                <TableCell>
                                                    <Typography variant="subtitle2">
                                                        {location.Name}
                                                    </Typography>
                                                    {location.Website && (
                                                        <Tooltip title="Visit website">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => window.open(location.Website, '_blank')}
                                                            >
                                                                <LinkIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                                <TableCell>{location.Category}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body2" noWrap>
                                                            {location.Address}
                                                        </Typography>
                                                        <Tooltip title="Open in Google Maps">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => openInMaps(location.Latitude, location.Longitude)}
                                                            >
                                                                <PlaceIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        {location.Tags.split(',').map((tag, index) => (
                                                            <Chip
                                                                key={index}
                                                                label={tag.trim()}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Edit">
                                                        <IconButton onClick={() => handleEdit(location)}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            onClick={() => handleDelete(location.ID)}
                                                            color="error"
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={filteredLocations.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </>
                )}
            </Box>

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
        </Card>
    );
} 