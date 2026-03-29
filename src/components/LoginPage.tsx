import React, { useState } from 'react';
import { ArrowTopRightOnSquareIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { DEFAULT_QUEER_MAP_BASE_URL } from '../lib/publicMapUrls';
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
    const [loading, setLoading] = useState(false);

    const publicMapUrl = (
        import.meta.env.VITE_QUEER_MAP_EMBED_URL || DEFAULT_QUEER_MAP_BASE_URL
    ).trim();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await AuthService.login(username, password);
            setLoading(false);
            if (result.success) {
                onLoginSuccess();
            } else {
                setError(result.error ?? 'Invalid username or password');
            }
        } catch (err) {
            setLoading(false);
            setError('Login failed');
        }
    };

    const inputClass =
        'w-full px-3.5 py-2.5 text-sm rounded-xl border border-black/10 bg-white/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-black/35 focus:border-[#9B8ACF] focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/25 transition-shadow';

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-gradient-to-br from-[#F0E8FF] via-[#FFF5FB] to-[#E8F4FF]">
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                style={{
                    backgroundImage:
                        'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(155, 138, 207, 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(255, 181, 218, 0.25), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(123, 108, 184, 0.12), transparent)',
                }}
            />
            <div className="relative w-full max-w-[400px]">
                <div className="rounded-2xl border border-white/70 bg-white/75 backdrop-blur-md shadow-[0_24px_80px_-12px_rgba(123,108,184,0.25),0_0_0_1px_rgba(255,255,255,0.8)_inset] p-8 sm:p-10">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#F5F0FF] shadow-[0_8px_24px_-8px_rgba(123,108,184,0.4)] ring-1 ring-black/[0.06]">
                            <img src={logo} alt="" className="h-10 w-10" aria-hidden />
                        </div>
                        <h1 className="text-[1.35rem] font-semibold tracking-tight text-[#1a1528]">
                            queer_map
                        </h1>
                        <p className="mt-1.5 text-sm text-black/50">Log in to manage locations and content</p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-6 rounded-xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="login-username" className="sr-only">
                                Username
                            </label>
                            <input
                                id="login-username"
                                type="text"
                                autoComplete="username"
                                required
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="login-password" className="sr-only">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`${inputClass} pr-14`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-black/45 hover:bg-black/[0.06] hover:text-[#7B6CB8] transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" aria-hidden />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" aria-hidden />
                                    )}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold text-white bg-[#9B8ACF] shadow-[0_4px_14px_-4px_rgba(123,108,184,0.45)] hover:bg-[#7B6CB8] focus:outline-none focus:ring-2 focus:ring-[#9B8ACF]/50 focus:ring-offset-2 disabled:opacity-55 disabled:pointer-events-none transition-colors"
                        >
                            {loading ? 'Logging in…' : 'Log in'}
                        </button>
                    </form>

                    {publicMapUrl ? (
                        <div className="mt-8 pt-6 border-t border-black/[0.06] text-center">
                            <a
                                href={publicMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#5c4d8a] hover:text-[#7B6CB8] transition-colors group"
                            >
                                <span>Open the public map</span>
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                            </a>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
