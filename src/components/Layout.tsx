import React, { useEffect, useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
    ArrowRightOnRectangleIcon,
    Squares2X2Icon as Squares2X2Outline,
    PlusIcon as PlusOutline,
    MapPinIcon as MapPinOutline,
    FolderIcon as FolderOutline,
    TagIcon as TagOutline,
    CodeBracketIcon as CodeBracketOutline,
    UserGroupIcon as UserGroupOutline,
} from '@heroicons/react/24/outline';
import {
    Squares2X2Icon,
    PlusIcon,
    MapPinIcon,
    FolderIcon,
    TagIcon,
    CodeBracketIcon,
    UserGroupIcon,
} from '@heroicons/react/24/solid';
import { AuthService } from '../services/AuthService';

const SIDEBAR_WIDTH = 80;

const menuItems = [
    { text: 'Dashboard', path: '/home', icon: Squares2X2Icon, iconOutline: Squares2X2Outline },
    { text: 'Create', path: '/create', icon: PlusIcon, iconOutline: PlusOutline },
    { text: 'Locations', path: '/locations', icon: MapPinIcon, iconOutline: MapPinOutline },
    { text: 'Categories', path: '/categories', icon: FolderIcon, iconOutline: FolderOutline },
    { text: 'Tags', path: '/tags', icon: TagIcon, iconOutline: TagOutline },
    { text: 'Scripts', path: '/scripts', icon: CodeBracketIcon, iconOutline: CodeBracketOutline },
];

const adminMenuItem = {
    text: 'Admin',
    path: '/admin',
    icon: UserGroupIcon,
    iconOutline: UserGroupOutline,
};

export default function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
    const location = useLocation();
    const [user, setUser] = useState(() => AuthService.getCurrentUser());
    useEffect(() => {
        setUser(AuthService.getCurrentUser());
        return AuthService.onAuthStateChange((u) => setUser(u));
    }, []);
    const navItems =
        user?.role === 'admin' ? [...menuItems, adminMenuItem] : menuItems;

    return (
        <div className="h-screen flex bg-[#F5F6F8] overflow-hidden">
            <aside
                className="shrink-0 flex flex-col bg-white border-r border-black/10 px-3 py-4"
                style={{ width: SIDEBAR_WIDTH }}
            >
                <nav className="flex-1 flex flex-col items-center justify-center gap-7 min-w-0">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = isActive ? item.icon : item.iconOutline;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/home'}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center w-full py-2 gap-1 rounded-md no-underline ${
                                        isActive
                                            ? 'text-[#7B6CB8] bg-[#9B8ACF]/15'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                    }`
                                }
                                title={item.text}
                            >
                                <Icon className="w-5 h-5" strokeWidth={isActive ? undefined : 1.5} />
                                <span className="text-[10px] leading-tight">{item.text}</span>
                            </NavLink>
                        );
                    })}
                </nav>
                <button
                    onClick={onLogout}
                    className="self-center p-2 mt-4 mb-2 text-gray-500 hover:text-gray-700 bg-[#9B8ACF]/25 hover:bg-[#9B8ACF]/40 rounded-lg"
                    title="Sign out"
                >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
            </aside>
            <main className="flex-1 min-w-0 flex flex-col min-h-0 overflow-auto p-3">
                <div className="flex-1 min-h-0 flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
