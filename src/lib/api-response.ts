

/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response format across all server actions.
 * Use these helpers instead of ad-hoc { success, error } objects.
 */

/** 
 * Standard API response type
 * Discriminated union for type-safe handling
 */
export type ApiResult<T> =
    | { success: true; data: T; message?: string }
    | { success: false; error: string; code?: ApiErrorCode };

/**
 * Common error codes for client-side handling
 */
export type ApiErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';

/**
 * Create a successful response
 */
export function ok<T>(data: T, message?: string): ApiResult<T> {
    return { success: true, data, message };
}

/**
 * Create a success response with just a message (no data)
 */
export function okMessage(message: string): ApiResult<null> {
    return { success: true, data: null, message };
}

/**
 * Create an error response
 */
export function fail(error: string, code?: ApiErrorCode): ApiResult<never> {
    return { success: false, error, code };
}

/**
 * Type guard to check if result is successful
 */
export function isOk<T>(result: ApiResult<T>): result is { success: true; data: T; message?: string } {
    return result.success === true;
}

/**
 * Type guard to check if result is an error
 */
export function isFail<T>(result: ApiResult<T>): result is { success: false; error: string; code?: ApiErrorCode } {
    return result.success === false;
}

/**
 * Unwrap a result, throwing if it's an error
 * Useful for chaining operations
 */
export function unwrap<T>(result: ApiResult<T>): T {
    if (!result.success) {
        throw new Error(result.error);
    }
    return result.data;
}

/**
 * Wrap an async operation in a try/catch and return ApiResult
 */
export async function tryCatch<T>(
    operation: () => Promise<T>,
    errorMessage = 'Operation failed'
): Promise<ApiResult<T>> {
    try {
        const data = await operation();
        return ok(data);
    } catch (error) {
        console.error('[tryCatch]', error);
        const message = error instanceof Error ? error.message : errorMessage;
        return fail(message, 'INTERNAL_ERROR');
    }
}
