class Logger {
    private static readonly LOG_KEY = 'app_logs';
    private static readonly MAX_LOGS = 1000; // Maximum number of logs to keep

    private static getStoredLogs(): string[] {
        try {
            const logs = localStorage.getItem(this.LOG_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch {
            return [];
        }
    }

    private static storeLogs(logs: string[]) {
        try {
            // Keep only the last MAX_LOGS entries
            const trimmedLogs = logs.slice(-this.MAX_LOGS);
            localStorage.setItem(this.LOG_KEY, JSON.stringify(trimmedLogs));
        } catch (e) {
            console.error('Failed to store logs:', e);
        }
    }

    static log(level: 'INFO' | 'ERROR' | 'WARN', message: string, error?: any) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${level}: ${message}${error ? '\n' + JSON.stringify(error, null, 2) : ''}`;
        
        // Log to console with appropriate styling
        const consoleStyle = 
            level === 'ERROR' ? 'background: #ff0000; color: white; padding: 2px 5px;' :
            level === 'WARN' ? 'background: #ff9900; color: white; padding: 2px 5px;' :
            'background: #009900; color: white; padding: 2px 5px;';
        
        console.log(`%c${level}`, consoleStyle, message);
        if (error) console.error(error);

        // Store in localStorage
        const logs = this.getStoredLogs();
        logs.push(logMessage);
        this.storeLogs(logs);

        // If it's an error, also store in the browser's error tracking
        if (level === 'ERROR') {
            const errorEvent = new ErrorEvent('error', {
                error: error instanceof Error ? error : new Error(message),
                message
            });
            window.dispatchEvent(errorEvent);
        }
    }

    static error(message: string, error?: any) {
        this.log('ERROR', message, error);
    }

    static info(message: string) {
        this.log('INFO', message);
    }

    static warn(message: string) {
        this.log('WARN', message);
    }

    static getLogs(): string[] {
        return this.getStoredLogs();
    }

    static clearLogs() {
        localStorage.removeItem(this.LOG_KEY);
    }
}

export default Logger; 