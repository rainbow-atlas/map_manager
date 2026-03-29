import { useEffect, useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LocationList from './components/LocationList'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import CategoriesPage from './components/CategoriesPage'
import TagsPage from './components/TagsPage'
import CreateLocationPage from './components/CreateLocationPage'
import HomePage from './components/HomePage'
import ScriptsPage from './components/ScriptsPage'
import AdminPage from './components/AdminPage'
import PublicContributePage from './components/PublicContributePage'
import { LocationService } from './services/LocationService'
import { AuthService } from './services/AuthService'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        AuthService.init();
        setIsAuthenticated(AuthService.isAuthenticated());
        const unsub = AuthService.onAuthStateChange((user) => {
            setIsAuthenticated(!!user);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            LocationService.initialize().catch((err) =>
                console.error('LocationService init failed:', err)
            );
        }
    }, [isAuthenticated]);

    const handleLoginSuccess = () => setIsAuthenticated(true);
    const handleLogout = async () => {
        await AuthService.logout();
        setIsAuthenticated(false);
    };

    const muiTheme = createTheme({
        palette: { primary: { main: '#9B8ACF' }, secondary: { main: '#FFB5DA' } },
        shape: { borderRadius: 2 },
    });

    return (
        <ThemeProvider theme={muiTheme}>
            <BrowserRouter basename="/map_manager">
                <Routes>
                    <Route path="/contribute" element={<PublicContributePage />} />
                    <Route
                        path="*"
                        element={
                            !isAuthenticated ? (
                                <LoginPage onLoginSuccess={handleLoginSuccess} />
                            ) : (
                                <Layout onLogout={handleLogout}>
                                    <Routes>
                                        <Route path="/home" element={<HomePage />} />
                                        <Route path="/locations" element={<LocationList />} />
                                        <Route path="/categories" element={<CategoriesPage />} />
                                        <Route path="/tags" element={<TagsPage />} />
                                        <Route path="/create" element={<CreateLocationPage />} />
                                        <Route path="/scripts" element={<ScriptsPage />} />
                                        <Route path="/admin" element={<AdminPage />} />
                                        <Route path="/" element={<Navigate to="/home" replace />} />
                                        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
                                        <Route path="*" element={<Navigate to="/home" replace />} />
                                    </Routes>
                                </Layout>
                            )
                        }
                    />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
