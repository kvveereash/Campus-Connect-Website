import type { ReportReason, ReportTarget } from '@prisma/client';

/* Shared by the report dialog and the admin queue, so the reporter and the
   admin read the same words for the same reason. Kept out of the actions
   file because a 'use server' module may only export async functions. */

export const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; label: string; hint: string }> = [
    { value: 'SPAM', label: 'Spam', hint: 'Ads, repeated posts or links that go nowhere useful' },
    { value: 'HARASSMENT', label: 'Harassment', hint: 'Bullying, threats or targeting a person' },
    { value: 'INAPPROPRIATE', label: 'Inappropriate', hint: 'Offensive, explicit or hateful' },
    { value: 'MISLEADING', label: 'Misleading', hint: 'False details, a fake event or a scam' },
    { value: 'OTHER', label: 'Something else', hint: 'Tell us in the details below' },
];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
    SPAM: 'Spam',
    HARASSMENT: 'Harassment',
    INAPPROPRIATE: 'Inappropriate',
    MISLEADING: 'Misleading',
    OTHER: 'Something else',
};

export const REPORT_TARGET_NOUN: Record<ReportTarget, string> = {
    EVENT: 'event',
    POST: 'post',
    COMMENT: 'comment',
    CLUB: 'club',
    USER: 'profile',
};

export const REPORT_DETAILS_MAX = 500;
