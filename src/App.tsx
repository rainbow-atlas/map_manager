import { useEffect, useState } from 'react'
import {
    CssBaseline,
    ThemeProvider,
    createTheme,
} from '@mui/material'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LocationList from './components/LocationList'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import CategoriesPage from './components/CategoriesPage'
import TagsPage from './components/TagsPage'
import CreateLocationPage from './components/CreateLocationPage'
import HomePage from './components/HomePage'
import { LocationService } from './services/LocationService'
import { AuthService } from './services/AuthService'

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#9B8ACF', // Pastel dark violet
            light: '#B8A9E1',
            dark: '#7B6CB8',
            contrastText: '#000000',
        },
        secondary: {
            main: '#FFB5DA', // Pastel pink
            light: '#FFC8E6',
            dark: '#FF94C7',
            contrastText: '#000000',
        },
        background: {
            default: '#FFFFFF',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#000000',
            secondary: '#000000',
        },
        divider: 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
        fontFamily: '"Helvetica", "Arial", sans-serif',
        allVariants: {
            color: '#000000',
        },
        h1: {
            fontSize: '2.5rem',
            fontWeight: 600,
            letterSpacing: '-0.5px',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.25px',
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
            letterSpacing: '-0.25px',
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            letterSpacing: '-0.25px',
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '-0.25px',
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '-0.25px',
        },
        subtitle1: {
            fontSize: '1rem',
            fontWeight: 500,
            letterSpacing: '0.15px',
        },
        subtitle2: {
            fontSize: '0.875rem',
            fontWeight: 500,
            letterSpacing: '0.1px',
        },
        body1: {
            fontSize: '1rem',
            letterSpacing: '0.15px',
        },
        body2: {
            fontSize: '0.875rem',
            letterSpacing: '0.15px',
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
            letterSpacing: '0.15px',
            color: '#000000',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#000000',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    },
                },
                outlined: {
                    borderColor: '#95D5B2',
                    '&:hover': {
                        backgroundColor: '#95D5B220',
                        borderColor: '#74C69D',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 600,
                    backgroundColor: '#F8F9FA',
                    color: '#000000',
                },
                root: {
                    fontSize: '0.875rem',
                    padding: '16px',
                    color: '#000000',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    borderRadius: 12,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#95D5B2',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#74C69D',
                        },
                    },
                    '& .MuiInputLabel-root': {
                        color: '#000000',
                        '&.Mui-focused': {
                            color: '#000000',
                        },
                    },
                    '& .MuiOutlinedInput-input': {
                        color: '#000000',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                    backgroundColor: '#95D5B220',
                    color: '#000000',
                    '&:hover': {
                        backgroundColor: '#95D5B240',
                    },
                },
                outlined: {
                    borderColor: '#95D5B2',
                    '&:hover': {
                        backgroundColor: '#95D5B220',
                    },
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
                standardSuccess: {
                    backgroundColor: '#95D5B220',
                    color: '#000000',
                },
                standardError: {
                    backgroundColor: '#FFB4AB20',
                    color: '#000000',
                },
                standardWarning: {
                    backgroundColor: '#FFE17920',
                    color: '#000000',
                },
                standardInfo: {
                    backgroundColor: '#CDB4DB20',
                    color: '#000000',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 12,
                },
            },
        },
        MuiIcon: {
            styleOverrides: {
                root: {
                    color: '#000000',
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: '#95D5B220',
                    },
                },
            },
        },
    },
    shape: {
        borderRadius: 8,
    },
});

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());

    useEffect(() => {
        if (isAuthenticated) {
            LocationService.initialize();
        }
    }, [isAuthenticated]);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        AuthService.logout();
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            </ThemeProvider>
        );
    }

  return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter basename="/map_manager">
                <Layout onLogout={handleLogout}>
                    <Routes>
                        <Route path="/home" element={<HomePage />} />
                        <Route path="/locations" element={<LocationList />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/tags" element={<TagsPage />} />
                        <Route path="/create" element={<CreateLocationPage />} />
                        <Route path="/scripts" element={<div>Scripts page coming soon...</div>} />
                        <Route path="/" element={<Navigate to="/home" replace />} />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App
