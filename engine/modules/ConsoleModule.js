class ConsoleModule {
    constructor() {
        this.logs = [];
        this.maxLogs = 500;
        this.newLogs = []; // Buffer for syncing
    }

    log(message, type = 'log') {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            message: message.toString(),
            type // 'log', 'warn', 'error', 'script'
        };
        
        this.logs.push(entry);
        this.newLogs.push(entry);

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Also output to real console so we don't lose terminal logs
        const originalConsole = global._originalConsole || console;
        if (type === 'error') originalConsole.error(message);
        else if (type === 'warn') originalConsole.warn(message);
        else originalConsole.log(message);
    }

    getNewLogs() {
        const logs = [...this.newLogs];
        this.newLogs = [];
        return logs;
    }

    clear() {
        this.logs = [];
        this.newLogs = [];
    }
}

module.exports = new ConsoleModule();
