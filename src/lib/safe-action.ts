import { z } from "zod";

export type ActionState<T> = {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
};

export const createSafeAction = <TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (validatedData: TInput) => Promise<TOutput>
) => {
    return async (data: TInput): Promise<ActionState<TOutput>> => {
        const validationResult = schema.safeParse(data);

        if (!validationResult.success) {
            return {
                fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
                error: "Validation failed",
            };
        }

        try {
            const result = await handler(validationResult.data);
            return { data: result };
        } catch (error) {
            console.error("Safe action error:", error);
            return {
                error: (error as Error).message || "Internal Server Error",
            };
        }
    };
};
