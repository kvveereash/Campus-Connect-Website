'use server';

/**
 * @deprecated Use `createProtectedAction` from `@/lib/protected-action` instead.
 * 
 * This file is kept temporarily for backward compatibility.
 * All server actions should use the unified `createProtectedAction` pattern
 * which includes authentication, rate limiting, audit logging, and
 * returns the standard `ApiResult<T>` type.
 * 
 * Migration guide:
 * - `createSafeAction(schema, handler)` → `createProtectedAction(schema, (data, session) => handler, options)`
 * - The session is now automatically provided — no need to call `getSession()` manually.
 * - All actions return `ApiResult<T>` instead of `{ data?, error? }`.
 * 
 * This file will be deleted in a future cleanup pass.
 */

import { z } from 'zod';

/** @deprecated Use createProtectedAction instead */
export const createSafeAction = <TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (validatedData: TInput) => Promise<TOutput>
) => {
    return async (data: TInput): Promise<{ data?: TOutput; error?: string }> => {
        const validationResult = schema.safeParse(data);
        if (!validationResult.success) {
            return { error: validationResult.error.issues.map(i => i.message).join(', ') };
        }
        try {
            const result = await handler(validationResult.data);
            return { data: result };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    };
};
