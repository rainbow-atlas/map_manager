import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Grid,
    Typography,
    CircularProgress,
    IconButton,
    Tooltip,
    useTheme,
    Paper,
    Button,
} from '@mui/material';
import {
    LocationOn,
    Category,
    LocalOffer as TagIcon,
    Update as UpdateIcon,
    Warning,
    AddOutlined,
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import { LocationService } from '../services/LocationService';
import { Location } from '../types/Location';
import { pastelColors } from '../utils/colors';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <Card
        sx={{
            p: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
                {title}
            </Typography>
            <Box sx={{ 
                p: 0.5, 
                borderRadius: 1,
                bgcolor: color + '20',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
            }}>
                {icon}
            </Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {value}
        </Typography>
    </Card>
);

export default function HomePage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const theme = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            await LocationService.refreshData();
            setLocations(LocationService.getAllLocations());
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Calculate statistics
    const totalLocations = locations.length;
    const uniqueCategories = new Set(locations.map(loc => loc.Category)).size;
    const uniqueTags = new Set(
        locations.flatMap(loc => loc.Tags.split(',').map(tag => tag.trim())).filter(Boolean)
    ).size;

    // Calculate locations needing update (older than 90 days)
    const needsUpdate = locations.filter(loc => {
        const lastChecked = new Date(loc['Last Checked']);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return lastChecked < ninetyDaysAgo;
    }).length;

    // Prepare data for category distribution chart
    const categoryData = Array.from(
        locations.reduce((acc, loc) => {
            acc.set(loc.Category, (acc.get(loc.Category) || 0) + 1);
            return acc;
        }, new Map<string, number>())
    ).map(([name, value]) => ({ name, value }));

    // Prepare data for tags distribution
    const tagData = Array.from(
        locations.flatMap(loc => 
            loc.Tags.split(',')
                .map(tag => tag.trim())
                .filter(Boolean)
        ).reduce((acc, tag) => {
            acc.set(tag, (acc.get(tag) || 0) + 1);
            return acc;
        }, new Map<string, number>())
    )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Only show top 10 tags

    // Prepare data for locations over time
    const timelineData = Array.from(
        locations.reduce((acc, loc) => {
            const month = new Date(loc['Last Checked']).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short'
            });
            acc.set(month, (acc.get(month) || 0) + 1);
            return acc;
        }, new Map<string, number>())
    )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
            const dateA = new Date(a.name);
            const dateB = new Date(b.name);
            return dateA.getTime() - dateB.getTime();
        });

    const CHART_COLORS = [
        theme.palette.primary.light,
        theme.palette.secondary.light,
        pastelColors.pink,
        pastelColors.yellow,
        pastelColors.lavender,
    ];

    return (
        <Box sx={{ 
            height: 'calc(100vh - 96px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 3,
        }}>
            {/* Header Section */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Dashboard Overview
                    </Typography>
                    <Tooltip title="Refresh data">
                        <IconButton 
                            onClick={loadData}
                            size="small"
                            sx={{ 
                                bgcolor: theme.palette.primary.light + '20',
                                '&:hover': { 
                                    bgcolor: theme.palette.primary.light + '40',
                                    transform: 'rotate(180deg)',
                                },
                                transition: 'transform 0.3s ease-in-out',
                            }}
                        >
                            <UpdateIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddOutlined />}
                    onClick={() => navigate('/create')}
                    sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                        },
                        transition: 'all 0.2s',
                    }}
                >
                    Create New Entry
                </Button>
            </Box>

            {/* Main Grid Container */}
            <Grid container spacing={2} sx={{ height: 'calc(100% - 48px)', mt: 0 }}>
                {/* Stats Cards Row */}
                <Grid item xs={12} sx={{ height: '20%' }}>
                    <Grid container spacing={2} sx={{ height: '100%', mt: 0 }}>
                        <Grid item xs={3} sx={{ height: '100%' }}>
                            <StatCard
                                title="Total Locations"
                                value={totalLocations}
                                icon={<LocationOn />}
                                color={pastelColors.blue}
                            />
                        </Grid>
                        <Grid item xs={3} sx={{ height: '100%' }}>
                            <StatCard
                                title="Categories"
                                value={uniqueCategories}
                                icon={<Category />}
                                color={pastelColors.purple}
                            />
                        </Grid>
                        <Grid item xs={3} sx={{ height: '100%' }}>
                            <StatCard
                                title="Unique Tags"
                                value={uniqueTags}
                                icon={<TagIcon />}
                                color={pastelColors.lavender}
                            />
                        </Grid>
                        <Grid item xs={3} sx={{ height: '100%' }}>
                            <StatCard
                                title="Needs Update"
                                value={needsUpdate}
                                icon={<Warning />}
                                color={pastelColors.pink}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                {/* Charts Row */}
                <Grid item xs={12} sx={{ height: '80%' }}>
                    <Grid container spacing={2} sx={{ height: '100%', mt: 0 }}>
                        {/* Timeline Chart */}
                        <Grid item xs={8} sx={{ height: '100%' }}>
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    p: 3,
                                    height: '100%',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Locations Timeline
                                </Typography>
                                <Box sx={{ flexGrow: 1 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis 
                                                dataKey="name" 
                                                tick={{ fontSize: 12 }} 
                                                stroke="#666"
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 12 }}
                                                stroke="#666"
                                            />
                                            <RechartsTooltip 
                                                contentStyle={{ 
                                                    background: 'rgba(255, 255, 255, 0.95)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke={theme.palette.primary.main}
                                                strokeWidth={3}
                                                dot={{ fill: theme.palette.primary.main }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Right Charts Column */}
                        <Grid item xs={4} sx={{ height: '100%' }}>
                            <Box sx={{ 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2
                            }}>
                                {/* Category Distribution */}
                                <Paper 
                                    elevation={0}
                                    sx={{ 
                                        p: 3,
                                        flex: 1,
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Category Distribution
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius="80%"
                                                    label={{ fontSize: 12 }}
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                                        />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    contentStyle={{ 
                                                        background: 'rgba(255, 255, 255, 0.95)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>

                                {/* Top Tags */}
                                <Paper 
                                    elevation={0}
                                    sx={{ 
                                        p: 3,
                                        flex: 1,
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Top Tags
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={tagData} layout="vertical" barSize={20}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    type="number" 
                                                    tick={{ fontSize: 12 }}
                                                    stroke="#666"
                                                />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    tick={{ fontSize: 12 }}
                                                    stroke="#666"
                                                    width={100}
                                                />
                                                <RechartsTooltip 
                                                    contentStyle={{ 
                                                        background: 'rgba(255, 255, 255, 0.95)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="value" 
                                                    fill={theme.palette.primary.light}
                                                    radius={[0, 4, 4, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
} 