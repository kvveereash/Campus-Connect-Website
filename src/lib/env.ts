import { z } from 'zod';

/**
 * Environment variable validation schema
 * Ensures all required environment variables are present and valid at startup
 */
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Authentication
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

    // Pusher (Real-time)
    PUSHER_APP_ID: z.string().min(1, 'PUSHER_APP_ID is required'),
    PUSHER_KEY: z.string().min(1, 'PUSHER_KEY is required'),
    PUSHER_SECRET: z.string().min(1, 'PUSHER_SECRET is required'),
    PUSHER_CLUSTER: z.string().min(1, 'PUSHER_CLUSTER is required'),

    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Public environment variables (safe to expose to client)
 */
const clientEnvSchema = z.object({
    NEXT_PUBLIC_PUSHER_KEY: z.string().min(1, 'NEXT_PUBLIC_PUSHER_KEY is required'),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1, 'NEXT_PUBLIC_PUSHER_CLUSTER is required'),
});

/**
 * Validate and parse environment variables
 * Throws an error with detailed message if validation fails
 */
function validateEnv() {
    try {
        const serverEnv = envSchema.parse(process.env);
        const clientEnv = clientEnvSchema.parse(process.env);

        return {
            ...serverEnv,
            ...clientEnv,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((err) => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

            throw new Error(
                `❌ Invalid environment variables:\n${missingVars}\n\n` +
                `Please check your .env file and ensure all required variables are set.`
            );
        }
        throw error;
    }
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();

/**
 * Type-safe environment variables
 */
export type Env = typeof env;
