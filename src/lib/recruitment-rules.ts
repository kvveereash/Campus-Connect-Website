/**
 * Club recruitment limits and the shape of what is stored, shared by the
 * server actions and the forms so both enforce the same numbers.
 */

export const MAX_QUESTIONS = 3;
export const QUESTION_MAX_LENGTH = 200;
export const ANSWER_MAX_LENGTH = 1000;

export type ApplicationState = 'PENDING' | 'ACCEPTED' | 'DECLINED';

/**
 * One answer, stored with the question it answered. Admins can reword or
 * replace questions between rounds, so an answer saved against an index
 * would end up under a question the applicant never saw.
 */
export interface ApplicationAnswer {
    question: string;
    answer: string;
}

/** `Club.recruitQuestions` is untyped JSON; anything unexpected reads as no questions. */
export function readQuestions(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .slice(0, MAX_QUESTIONS);
}

/** `ClubApplication.answers` is untyped JSON; rows that do not fit are dropped. */
export function readAnswers(value: unknown): ApplicationAnswer[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (
            item &&
            typeof item === 'object' &&
            typeof (item as Record<string, unknown>).question === 'string' &&
            typeof (item as Record<string, unknown>).answer === 'string'
        ) {
            const { question, answer } = item as ApplicationAnswer;
            return [{ question, answer }];
        }
        return [];
    });
}
