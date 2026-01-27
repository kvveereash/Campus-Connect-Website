/**
 * Structured Logger Utility
 * Provides consistent, structured logging across the application
 */

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

interface LogContext {
    userId?: string;
    requestId?: string;
    action?: string;
    duration?: number;
    [key: string]: any;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    /**
     * Format log entry as JSON for production, pretty print for development
     */
    private formatLog(entry: LogEntry): string {
        if (this.isDevelopment) {
            // Pretty print for development
            const emoji = this.getEmoji(entry.level);
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            let output = `${emoji} [${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

            if (entry.context) {
                output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
            }

            if (entry.error) {
                output += `\n  Error: ${entry.error.message}`;
                if (entry.error.stack) {
                    output += `\n  Stack: ${entry.error.stack}`;
                }
            }

            return output;
        } else {
            // JSON for production (easier to parse by log aggregators)
            return JSON.stringify(entry);
        }
    }

    private getEmoji(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG: return '🔍';
            case LogLevel.INFO: return 'ℹ️';
            case LogLevel.WARN: return '⚠️';
            case LogLevel.ERROR: return '❌';
            default: return '📝';
        }
    }

    private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        const formatted = this.formatLog(entry);

        // Output to appropriate console method
        switch (level) {
            case LogLevel.ERROR:
                console.error(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.DEBUG:
                if (this.isDevelopment) console.debug(formatted);
                break;
            default:
                console.log(formatted);
        }
    }

    /**
     * Log debug information (development only)
     */
    debug(message: string, context?: LogContext) {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * Log informational messages
     */
    info(message: string, context?: LogContext) {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * Log warnings
     */
    warn(message: string, context?: LogContext) {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * Log errors
     */
    error(message: string, error?: Error, context?: LogContext) {
        this.log(LogLevel.ERROR, message, context, error);
    }

    /**
     * Log API request
     */
    request(method: string, path: string, context?: LogContext) {
        this.info(`${method} ${path}`, {
            ...context,
            type: 'request',
        });
    }

    /**
     * Log API response with duration
     */
    response(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
        const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, `${method} ${path} - ${statusCode}`, {
            ...context,
            type: 'response',
            statusCode,
            duration,
        });
    }

    /**
     * Log database query
     */
    query(operation: string, model: string, duration?: number, context?: LogContext) {
        this.debug(`DB ${operation} ${model}`, {
            ...context,
            type: 'database',
            operation,
            model,
            duration,
        });
    }

    /**
     * Log authentication event
     */
    auth(event: 'login' | 'logout' | 'signup' | 'failed', userId?: string, context?: LogContext) {
        const level = event === 'failed' ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, `Auth: ${event}`, {
            ...context,
            type: 'auth',
            event,
            userId,
        });
    }

    /**
     * Log rate limit event
     */
    rateLimit(action: string, identifier: string, blocked: boolean, context?: LogContext) {
        const level = blocked ? LogLevel.WARN : LogLevel.DEBUG;
        this.log(level, `Rate limit ${blocked ? 'BLOCKED' : 'allowed'}: ${action}`, {
            ...context,
            type: 'rateLimit',
            action,
            identifier,
            blocked,
        });
    }

    /**
     * Log performance metric
     */
    performance(operation: string, duration: number, context?: LogContext) {
        const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
        this.log(level, `Performance: ${operation} took ${duration}ms`, {
            ...context,
            type: 'performance',
            operation,
            duration,
        });
    }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Generate unique request ID for correlation
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Measure execution time of async function
 */
export async function measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.performance(operation, duration, context);
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error(`${operation} failed after ${duration}ms`, error as Error, context);
        throw error;
    }
}
