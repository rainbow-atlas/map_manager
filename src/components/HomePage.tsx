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
} from '@mui/material';
import {
    LocationOn,
    Category,
    LocalOffer as TagIcon,
    Update as UpdateIcon,
    Warning,
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
            bgcolor: color + '10',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            },
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
        pastelColors.green,
    ];

    return (
        <Box sx={{ 
            height: 'calc(100vh - 96px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 2,
        }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2,
                height: '32px',
            }}>
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

            <Box sx={{ height: 'calc(100% - 48px)' }}> {/* Adjusted for header height + margin */}
                <Grid container spacing={2} sx={{ height: '100%' }}>
                    {/* Stats Row */}
                    <Grid item xs={12}>
                        <Grid container spacing={2} sx={{ height: '90px' }}>
                            <Grid item xs={3}>
                                <StatCard
                                    title="Total Locations"
                                    value={totalLocations}
                                    icon={<LocationOn />}
                                    color={pastelColors.blue}
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <StatCard
                                    title="Categories"
                                    value={uniqueCategories}
                                    icon={<Category />}
                                    color={pastelColors.purple}
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <StatCard
                                    title="Unique Tags"
                                    value={uniqueTags}
                                    icon={<TagIcon />}
                                    color={pastelColors.green}
                                />
                            </Grid>
                            <Grid item xs={3}>
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
                    <Grid item xs={12} sx={{ height: 'calc(100% - 106px)' }}> {/* Adjusted for stats height + spacing */}
                        <Grid container spacing={2} sx={{ height: '100%' }}>
                            {/* Timeline Chart */}
                            <Grid item xs={8} sx={{ height: '100%' }}>
                                <Paper 
                                    sx={{ 
                                        p: 2,
                                        height: '100%',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Locations Timeline
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={timelineData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{ fontSize: 11 }} 
                                                    height={20}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 11 }}
                                                    width={25}
                                                />
                                                <RechartsTooltip />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="value" 
                                                    stroke={theme.palette.primary.main}
                                                    strokeWidth={2}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Right Column Charts */}
                            <Grid item xs={4} sx={{ height: '100%' }}>
                                <Grid container spacing={2} sx={{ height: '100%' }}>
                                    {/* Pie Chart */}
                                    <Grid item xs={12} sx={{ height: '50%' }}>
                                        <Paper 
                                            sx={{ 
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
                                                            outerRadius={45}
                                                            label={{ fontSize: 11 }}
                                                        >
                                                            {categoryData.map((entry, index) => (
                                                                <Cell 
                                                                    key={`cell-${index}`} 
                                                                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    {/* Bar Chart */}
                                    <Grid item xs={12} sx={{ height: 'calc(50% - 16px)' }}> {/* Adjusted for grid spacing */}
                                        <Paper 
                                            sx={{ 
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                Top Tags
                                            </Typography>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={tagData} layout="vertical" barSize={12}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis 
                                                            type="number" 
                                                            tick={{ fontSize: 11 }}
                                                            height={20}
                                                        />
                                                        <YAxis 
                                                            dataKey="name" 
                                                            type="category" 
                                                            width={70}
                                                            tick={{ fontSize: 11 }}
                                                        />
                                                        <RechartsTooltip />
                                                        <Bar 
                                                            dataKey="value" 
                                                            fill={pastelColors.purple + '80'}
                                                            radius={[0, 4, 4, 0]}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
} 