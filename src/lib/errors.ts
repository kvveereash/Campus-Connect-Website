import { logger } from './logger';

/**
 * Custom Error Classes
 * Provides structured, typed errors with better context
 */

export enum ErrorCode {
    // Authentication Errors (1000-1099)
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

    // Validation Errors (1100-1199)
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // Resource Errors (1200-1299)
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',

    // Rate Limiting (1300-1399)
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

    // Database Errors (1400-1499)
    DATABASE_ERROR = 'DATABASE_ERROR',
    QUERY_FAILED = 'QUERY_FAILED',

    // External Service Errors (1500-1599)
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    PUSHER_ERROR = 'PUSHER_ERROR',

    // Generic Errors (1900-1999)
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Base Application Error
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        statusCode: number = 500,
        isOperational: boolean = true,
        context?: Record<string, any>
    ) {
        super(message);

        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
        super(message, ErrorCode.UNAUTHORIZED, 401, true, context);
    }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
        super(message, ErrorCode.INSUFFICIENT_PERMISSIONS, 403, true, context);
    }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCode.VALIDATION_ERROR, 400, true, context);
    }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource', context?: Record<string, any>) {
        super(`${resource} not found`, ErrorCode.NOT_FOUND, 404, true, context);
    }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists', context?: Record<string, any>) {
        super(message, ErrorCode.ALREADY_EXISTS, 409, true, context);
    }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded', resetTime?: Date, context?: Record<string, any>) {
        super(
            message,
            ErrorCode.RATE_LIMIT_EXCEEDED,
            429,
            true,
            { ...context, resetTime: resetTime?.toISOString() }
        );
    }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
    constructor(message: string = 'Database operation failed', context?: Record<string, any>) {
        super(message, ErrorCode.DATABASE_ERROR, 500, false, context);
    }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
    constructor(service: string, message: string, context?: Record<string, any>) {
        super(
            `${service} error: ${message}`,
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            503,
            false,
            { ...context, service }
        );
    }
}

/**
 * Error Response Type
 */
export interface ErrorResponse {
    success: false;
    error: string;
    code?: ErrorCode;
    details?: any;
    timestamp?: string;
}

/**
 * Centralized Error Handler
 */
export class ErrorHandler {
    /**
     * Handle error and return user-friendly response
     */
    static handle(error: unknown, context?: Record<string, any>): ErrorResponse {
        // Log the error
        if (error instanceof AppError) {
            logger.error(error.message, error, { ...context, ...error.context, code: error.code });
        } else if (error instanceof Error) {
            logger.error(error.message, error, context);
        } else {
            logger.error('Unknown error occurred', undefined, { error, ...context });
        }

        // Return appropriate response
        if (error instanceof AppError) {
            return {
                success: false,
                error: this.getUserFriendlyMessage(error),
                code: error.code,
                details: process.env.NODE_ENV === 'development' ? error.context : undefined,
                timestamp: new Date().toISOString(),
            };
        }

        if (error instanceof Error) {
            return {
                success: false,
                error: process.env.NODE_ENV === 'development'
                    ? error.message
                    : 'An unexpected error occurred. Please try again.',
                code: ErrorCode.INTERNAL_ERROR,
                timestamp: new Date().toISOString(),
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
            code: ErrorCode.UNKNOWN_ERROR,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get user-friendly error message
     */
    private static getUserFriendlyMessage(error: AppError): string {
        // In production, sanitize error messages
        if (process.env.NODE_ENV === 'production') {
            switch (error.code) {
                case ErrorCode.UNAUTHORIZED:
                    return 'Please log in to continue.';
                case ErrorCode.INSUFFICIENT_PERMISSIONS:
                    return 'You do not have permission to perform this action.';
                case ErrorCode.VALIDATION_ERROR:
                case ErrorCode.INVALID_INPUT:
                    return error.message; // Validation messages are safe to show
                case ErrorCode.NOT_FOUND:
                    return error.message;
                case ErrorCode.ALREADY_EXISTS:
                case ErrorCode.CONFLICT:
                    return error.message;
                case ErrorCode.RATE_LIMIT_EXCEEDED:
                    return error.message;
                case ErrorCode.DATABASE_ERROR:
                case ErrorCode.QUERY_FAILED:
                    return 'A database error occurred. Please try again later.';
                case ErrorCode.EXTERNAL_SERVICE_ERROR:
                    return 'An external service is temporarily unavailable. Please try again later.';
                default:
                    return 'An unexpected error occurred. Please try again.';
            }
        }

        // In development, show full error message
        return error.message;
    }

    /**
     * Check if error is operational (expected) or programming error
     */
    static isOperationalError(error: unknown): boolean {
        if (error instanceof AppError) {
            return error.isOperational;
        }
        return false;
    }
}

/**
 * Async error wrapper for server actions
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: Record<string, any>
): T {
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (error) {
            return ErrorHandler.handle(error, context);
        }
    }) as T;
}
