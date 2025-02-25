import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    Container,
    InputAdornment,
    IconButton,
    Paper,
    useTheme,
} from '@mui/material';
import {
    VisibilityOutlined,
    VisibilityOffOutlined,
    LoginOutlined,
    PersonOutlineOutlined,
    LockOutlined,
} from '@mui/icons-material';
import { AuthService } from '../services/AuthService';
import logo from '../assets/logo.svg';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const theme = useTheme();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (AuthService.login(username, password)) {
            onLoginSuccess();
        } else {
            setError('Invalid username or password');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #F8E8FF, #E8ECFF, #FFE8F3)',
                position: 'fixed',
                top: 0,
                left: 0,
            }}
        >
            <Container maxWidth="sm" sx={{ margin: 0 }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <Box
                        sx={{
                            p: 6,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Box
                            component="img"
                            src={logo}
                            alt="Rainbow Atlas Logo"
                            sx={{
                                width: 160,
                                height: 160,
                                mb: 4,
                                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
                            }}
                        />
                        <Typography
                            variant="h3"
                            component="h1"
                            gutterBottom
                            sx={{
                                fontWeight: 700,
                                textAlign: 'center',
                                mb: 4,
                                letterSpacing: '-0.5px',
                            }}
                        >
                            Rainbow Atlas
                        </Typography>

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    width: '100%',
                                    mb: 3,
                                    borderRadius: 2,
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                            }}
                        >
                            <TextField
                                required
                                fullWidth
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoFocus
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutlineOutlined sx={{ color: theme.palette.primary.main }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlined sx={{ color: theme.palette.primary.main }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? 
                                                    <VisibilityOffOutlined sx={{ color: theme.palette.primary.main }} /> : 
                                                    <VisibilityOutlined sx={{ color: theme.palette.primary.main }} />
                                                }
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={<LoginOutlined />}
                                sx={{
                                    mt: 2,
                                    py: 1.5,
                                    borderRadius: 2,
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                    '&:hover': {
                                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
                                        transform: 'translateY(-1px)',
                                    },
                                    transition: 'transform 0.2s',
                                }}
                            >
                                Sign In
                            </Button>
                        </Box>

                        <Box sx={{ mt: 4, textAlign: 'center' }}>
                            <Typography variant="body2" gutterBottom>
                                Available roles:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {['admin', 'editor', 'viewer', 'guest'].map((role) => (
                                    <Typography
                                        key={role}
                                        variant="body2"
                                        sx={{
                                            backgroundColor: theme.palette.primary.light + '20',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {role}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
} 