import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Button,
    Tooltip,
    useTheme,
    Divider,
} from '@mui/material';
import {
    MenuOutlined,
    AddOutlined,
    PlaceOutlined,
    CategoryOutlined,
    LocalOfferOutlined,
    CodeOutlined,
    LogoutOutlined,
    PersonOutlineOutlined,
    DashboardOutlined,
} from '@mui/icons-material';
import { AuthService } from '../services/AuthService';

const DRAWER_WIDTH = 240;

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

export default function Layout({ children, onLogout }: LayoutProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = AuthService.getCurrentUser();

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardOutlined />, path: '/home' },
        { text: 'Create', icon: <AddOutlined />, path: '/create' },
        { text: 'Locations', icon: <PlaceOutlined />, path: '/locations' },
        { text: 'Categories', icon: <CategoryOutlined />, path: '/categories' },
        { text: 'Tags', icon: <LocalOfferOutlined />, path: '/tags' },
        { text: 'Scripts', icon: <CodeOutlined />, path: '/scripts' },
    ];

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    const drawer = (
        <Box>
            <Toolbar>
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                    Rainbow Atlas
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                '&.Mui-selected': {
                                    bgcolor: theme.palette.primary.main + '10',
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.main + '20',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon 
                                sx={{ 
                                    color: location.pathname === item.path ? 'primary.main' : 'inherit',
                                    minWidth: 40,
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText 
                                primary={item.text}
                                primaryTypographyProps={{
                                    sx: {
                                        fontWeight: location.pathname === item.path ? 600 : 400,
                                        color: location.pathname === item.path ? 'primary.main' : 'inherit',
                                    },
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar
                position="fixed"
                sx={{
                    backgroundColor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { sm: `${DRAWER_WIDTH}px` },
                }}
                elevation={0}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
                    >
                        <MenuOutlined />
                    </IconButton>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}
                    >
                        Map Manager
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Tooltip title={`Logged in as ${currentUser?.username} (${currentUser?.role})`}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonOutlineOutlined color="primary" />
                                <Typography variant="body2" color="text.secondary">
                                    {currentUser?.username}
                                </Typography>
                            </Box>
                        </Tooltip>
                        <Button
                            variant="outlined"
                            startIcon={<LogoutOutlined />}
                            onClick={onLogout}
                            size="small"
                        >
                            Sign Out
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            backgroundColor: theme.palette.background.paper,
                            borderRight: 1,
                            borderColor: 'divider',
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            backgroundColor: theme.palette.background.paper,
                            borderRight: 1,
                            borderColor: 'divider',
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    backgroundColor: 'background.default',
                    minHeight: '100vh',
                }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
} 