import { dataProvider } from "@/data"; // Importing the abstraction layer

/* ==================================================================================
   TYPES
   ================================================================================== */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
    timestamp: number;
    readableTime: string;
    level: LogLevel;
    tag: string;
    message: string;
    data?: any;
}

interface LogConfig {
    username: string;
    checkInTime: string;
    platform: string;
    appName: string;
}

const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 15000;

class LogManager {
    private buffer: LogEntry[] = [];
    private config: LogConfig | null = null;
    private flushTimer: NodeJS.Timeout | null = null;
    private isConfigured = false;

    constructor() {
        this.startFlushTimer();
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flush(true));
        }
    }

    public configure(config: LogConfig) {
        this.config = {
            ...config,
            username: config.username.replace(/[.#$[\]]/g, "_")
        };
        this.isConfigured = true;
        this.flush();
    }

    // ... [info, warn, error, debug methods remain the same] ...
    public info(tag: string, message: string, data?: any) { this.processLog('info', tag, message, data); }
    public warn(tag: string, message: string, data?: any) { this.processLog('warn', tag, message, data); }
    public error(tag: string, message: string, data?: any) { this.processLog('error', tag, message, data); }
    public debug(tag: string, message: string, data?: any) { this.processLog('debug', tag, message, data); }

    private processLog(level: LogLevel, tag: string, message: string, data?: any) {
        const now = new Date();
        const entry: LogEntry = {
            timestamp: now.getTime(),
            readableTime: now.toISOString(),
            level,
            tag,
            message,
            data: data ? JSON.parse(JSON.stringify(data, this.getCircularReplacer())) : undefined
        };

        this.writeToConsole(entry);
        this.buffer.push(entry);

        if (this.buffer.length >= BATCH_SIZE) {
            this.flush();
        }
    }

    private async flush(force = false) {
        if (this.buffer.length === 0) return;

        if (!this.isConfigured || !this.config) {
            if (force) console.warn("[LogManager] Force flush requested but Logger not configured.");
            return;
        }

        const batchToSend = [...this.buffer];
        this.buffer = [];

        // Construct the path
        // logs/<username>/<checkintime>/<platform>/<appname>
        const path = `logs/${this.config.username}/${this.config.checkInTime}/${this.config.platform}/${this.config.appName}`;

        // Payload
        const payload = {
            uploadTimestamp: new Date().toISOString(),
            entries: batchToSend
        };

        // USE THE ABSTRACTION LAYER
        // We do not import firebase here. We use dataProvider.push
        // try {
        //     await dataProvider.push(path, payload);
        // } catch (err) {
        //     console.error("[LogManager] Failed to upload logs via DataProvider", err);
        //     // Logic to retry could go here
        // }
    }

    private writeToConsole(entry: LogEntry) {
        // ... [Console styling logic remains the same] ...
        const style = `color: ${entry.level === 'error' ? 'red' : entry.level === 'warn' ? 'orange' : 'blue'}`;
        console.log(`%c[${entry.tag}] ${entry.message}`, style, entry.data || '');
    }

    private startFlushTimer() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => {
            this.flush();
        }, FLUSH_INTERVAL_MS);
    }

    private getCircularReplacer() {
        const seen = new WeakSet();
        return (key: any, value: any) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) return;
                seen.add(value);
            }
            return value;
        };
    }
}

export const logger = new LogManager();