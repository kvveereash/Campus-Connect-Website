/**
 * Pagination Helper Utilities
 * Provides consistent pagination across the application
 */

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number = DEFAULT_PAGE, limit: number = DEFAULT_LIMIT): number {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    return (safePage - 1) * safeLimit;
}

/**
 * Validate and sanitize pagination params
 */
export function validatePaginationParams(params?: PaginationParams): { page: number; limit: number } {
    const page = Math.max(1, params?.page || DEFAULT_PAGE);
    const limit = Math.min(Math.max(1, params?.limit || DEFAULT_LIMIT), MAX_LIMIT);
    return { page, limit };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}

/**
 * Prisma pagination helper
 * Returns skip and take values for Prisma queries
 */
export function getPrismaPagination(params?: PaginationParams): { skip: number; take: number } {
    const { page, limit } = validatePaginationParams(params);
    return {
        skip: getPaginationOffset(page, limit),
        take: limit,
    };
}
