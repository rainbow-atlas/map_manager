import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Collapse,
    Autocomplete,
    Badge,
} from '@mui/material';
import {
    EditOutlined,
    DeleteOutlineOutlined,
    AddOutlined,
    SearchOutlined,
    FilterListOutlined,
    LinkOutlined,
    PlaceOutlined,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    ClearOutlined,
    RefreshOutlined,
} from '@mui/icons-material';
import { Location } from '../types/Location';
import { LocationService } from '../services/LocationService';
import LocationForm from './LocationForm';
import { pastelColors } from '../utils/colors';
import { useTheme } from '@mui/material/styles';

interface FilterState {
    search: string;
    category: string;
    tags: string[];
    lastCheckedDays: number;
}

export default function LocationList() {
    const navigate = useNavigate();
    const [locations, setLocations] = useState<Location[]>([]);
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        category: '',
        tags: [],
        lastCheckedDays: 0,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [editLocation, setEditLocation] = useState<Location | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const theme = useTheme();

    const loadLocations = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await LocationService.refreshData();
            const allLocations = LocationService.getAllLocations();
            setLocations(allLocations);
            
            // Get tags from the Tags worksheet
            setAvailableTags(LocationService.getTags());
            
            // Get categories
            setCategories(LocationService.getCategories());
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
        let filtered = [...locations];

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(location =>
                Object.values(location).some(value =>
                    value?.toString().toLowerCase().includes(searchLower)
                )
            );
        }

        // Apply category filter
        if (filters.category) {
            filtered = filtered.filter(location =>
                location.Category === filters.category
            );
        }

        // Apply tags filter
        if (filters.tags.length > 0) {
            filtered = filtered.filter(location => {
                const locationTags = location.Tags.split(',').map(tag => tag.trim());
                return filters.tags.every(tag => locationTags.includes(tag));
            });
        }

        // Apply last checked filter
        if (filters.lastCheckedDays > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filters.lastCheckedDays);
            filtered = filtered.filter(location => {
                const lastChecked = new Date(location['Last Checked']);
                return lastChecked < cutoffDate;
            });
        }

        setFilteredLocations(filtered);
        setPage(0);
    }, [filters, locations]);

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

    const hasActiveFilters = filters.search || filters.category || filters.tags.length > 0 || filters.lastCheckedDays > 0;

    const handleClearFilters = () => {
        setFilters({
            search: '',
            category: '',
            tags: [],
            lastCheckedDays: 0,
        });
    };

    return (
        <Card sx={{ 
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
        }}>
            <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography 
                        variant="h4" 
                        component="h1" 
                        gutterBottom 
                        sx={{ 
                            fontWeight: 500,
                            color: 'text.primary',
                            mb: 3,
                        }}
                    >
                        Locations
                        {filteredLocations.length !== locations.length && (
                            <Typography 
                                component="span" 
                                sx={{ 
                                    ml: 2,
                                    color: 'text.secondary',
                                    fontSize: '1rem',
                                    fontWeight: 400,
                                }}
                            >
                                {filteredLocations.length} of {locations.length} locations
                            </Typography>
                        )}
                    </Typography>

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mb: 2,
                                borderRadius: 2,
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        alignItems: 'center', 
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                        },
                    }}>
                        <TextField
                            label="Search locations"
                            variant="outlined"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            sx={{ 
                                flexGrow: 1,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: pastelColors.blue + '20',
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchOutlined sx={{ color: 'primary.light' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Badge 
                            color="primary" 
                            variant="dot" 
                            invisible={!hasActiveFilters}
                        >
                            <Button
                                variant="outlined"
                                startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                onClick={() => setShowFilters(!showFilters)}
                                endIcon={<FilterListOutlined />}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: showFilters ? pastelColors.purple + '20' : 'transparent',
                                }}
                            >
                                Filters
                            </Button>
                        </Badge>
                        {hasActiveFilters && (
                            <Tooltip title="Clear all filters">
                                <IconButton 
                                    onClick={handleClearFilters}
                                    sx={{ 
                                        bgcolor: pastelColors.pink + '20',
                                        '&:hover': {
                                            bgcolor: pastelColors.pink + '40',
                                        },
                                    }}
                                >
                                    <ClearOutlined />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Refresh data">
                            <IconButton
                                onClick={loadLocations}
                                disabled={isLoading}
                                color="primary"
                                sx={{ 
                                    bgcolor: theme.palette.primary.light + '20',
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.light + '40',
                                    },
                                }}
                            >
                                <RefreshOutlined />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Collapse in={showFilters}>
                        <Paper 
                            elevation={0}
                            sx={{ 
                                p: 2, 
                                mb: 2,
                                bgcolor: pastelColors.gray,
                                borderRadius: 2,
                            }}
                        >
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 2,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.paper',
                                    borderRadius: 2,
                                },
                            }}>
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={filters.category}
                                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                        label="Category"
                                    >
                                        <MenuItem value="">All Categories</MenuItem>
                                        {categories.map((category) => (
                                            <MenuItem key={category} value={category}>
                                                {category}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl sx={{ flexGrow: 1 }}>
                                    <Autocomplete
                                        multiple
                                        options={availableTags}
                                        value={filters.tags}
                                        onChange={(_, newValue) => setFilters({ ...filters, tags: newValue })}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Tags" placeholder="Select tags" />
                                        )}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    label={option}
                                                    {...getTagProps({ index })}
                                                    key={option}
                                                    sx={{
                                                        bgcolor: pastelColors.yellow + '40',
                                                        '& .MuiChip-deleteIcon': {
                                                            color: 'text.secondary',
                                                        },
                                                    }}
                                                />
                                            ))
                                        }
                                    />
                                </FormControl>
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Last Checked</InputLabel>
                                    <Select
                                        value={filters.lastCheckedDays}
                                        onChange={(e) => setFilters({ ...filters, lastCheckedDays: Number(e.target.value) })}
                                        label="Last Checked"
                                    >
                                        <MenuItem value={0}>Any time</MenuItem>
                                        <MenuItem value={30}>Older than 30 days</MenuItem>
                                        <MenuItem value={90}>Older than 90 days</MenuItem>
                                        <MenuItem value={180}>Older than 180 days</MenuItem>
                                        <MenuItem value={365}>Older than 1 year</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Paper>
                    </Collapse>
                </Box>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <TableContainer sx={{ 
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            mb: 2,
                        }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Last Checked</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredLocations
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((location) => (
                                            <TableRow 
                                                key={location.ID} 
                                                hover
                                                sx={{
                                                    '&:hover': {
                                                        bgcolor: pastelColors.blue + '10',
                                                    },
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                                                        {location.Name}
                                                    </Typography>
                                                    {location.Website && (
                                                        <Tooltip title="Visit website">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => window.open(location.Website, '_blank')}
                                                            >
                                                                <LinkOutlined fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={location.Category}
                                                        size="small"
                                                        sx={{ 
                                                            bgcolor: pastelColors.purple + '20',
                                                            fontWeight: 500,
                                                        }}
                                                    />
                                                </TableCell>
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
                                                                <PlaceOutlined fontSize="small" />
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
                                                                sx={{ 
                                                                    bgcolor: pastelColors.yellow + '20',
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(location['Last Checked']).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Edit">
                                                        <IconButton 
                                                            onClick={() => handleEdit(location)}
                                                            sx={{ 
                                                                bgcolor: pastelColors.blue + '20',
                                                                mr: 1,
                                                                '&:hover': {
                                                                    bgcolor: pastelColors.blue + '40',
                                                                },
                                                            }}
                                                        >
                                                            <EditOutlined />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            onClick={() => handleDelete(location.ID)}
                                                            sx={{ 
                                                                bgcolor: pastelColors.pink + '20',
                                                                '&:hover': {
                                                                    bgcolor: pastelColors.pink + '40',
                                                                },
                                                            }}
                                                        >
                                                            <DeleteOutlineOutlined />
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
                            sx={{
                                '.MuiTablePagination-select': {
                                    borderRadius: 1,
                                },
                            }}
                        />
                    </>
                )}
            </Box>

            <Dialog 
                open={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    },
                }}
            >
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