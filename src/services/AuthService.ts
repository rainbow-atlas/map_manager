interface User {
    username: string;
    role: 'admin' | 'editor' | 'viewer' | 'guest';
}

interface UserConfig {
    password: string;
    role: 'admin' | 'editor' | 'viewer' | 'guest';
}

export class AuthService {
    private static currentUser: User | null = null;
    private static readonly users = new Map<string, UserConfig>();

    static {
        // Load users from environment variables
        const usersConfig = import.meta.env.VITE_USERS_CONFIG;
        if (!usersConfig) {
            throw new Error('VITE_USERS_CONFIG environment variable is not set');
        }

        try {
            const users = JSON.parse(usersConfig);
            Object.entries(users).forEach(([username, config]) => {
                if (typeof config === 'object' && config !== null && 'password' in config && 'role' in config) {
                    this.users.set(username, config as UserConfig);
                }
            });
        } catch (error) {
            console.error('Failed to parse users configuration:', error);
            throw new Error('Invalid users configuration format');
        }

        if (this.users.size === 0) {
            throw new Error('No valid users found in configuration');
        }
    }

    static login(username: string, password: string): boolean {
        const user = this.users.get(username);
        if (user && user.password === password) {
            this.currentUser = { username, role: user.role };
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            return true;
        }
        return false;
    }

    static logout(): void {
        this.currentUser = null;
        localStorage.removeItem('user');
    }

    static getCurrentUser(): User | null {
        if (!this.currentUser) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
            }
        }
        return this.currentUser;
    }

    static isAuthenticated(): boolean {
        return !!this.getCurrentUser();
    }

    static hasPermission(requiredRole: 'admin' | 'editor' | 'viewer' | 'guest'): boolean {
        const user = this.getCurrentUser();
        if (!user) return false;

        const roles = {
            admin: 4,
            editor: 3,
            viewer: 2,
            guest: 1
        };

        return roles[user.role] >= roles[requiredRole];
    }
} 