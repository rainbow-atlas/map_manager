interface User {
    username: string;
    role: 'admin' | 'editor' | 'viewer' | 'guest';
}

export class AuthService {
    private static currentUser: User | null = null;

    private static readonly users = new Map([
        ['admin', { password: 'rainbow2024!', role: 'admin' as const }],
        ['editor', { password: 'atlas2024!', role: 'editor' as const }],
        ['viewer', { password: 'map2024!', role: 'viewer' as const }],
        ['guest', { password: 'welcome2024!', role: 'guest' as const }]
    ]);

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