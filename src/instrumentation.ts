import type { Instrumentation } from 'next';

/**
 * Every error a server render, route handler or server action throws, in one
 * structured log line with the request id the middleware set, so a reader's
 * "Reference" (the digest) and a log line can be matched up.
 *
 * The route pattern is logged, never the URL: /reset-password/[token] would
 * otherwise write a live reset token into the log.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
    const { logger } = await import('@/lib/logger');
    const err = error instanceof Error ? error : new Error(String(error));
    const requestId = request.headers['x-request-id'];
    logger.error('Request failed', err, {
        requestId: Array.isArray(requestId) ? requestId[0] : requestId,
        digest: (error as { digest?: string }).digest,
        method: request.method,
        route: context.routePath,
        routeType: context.routeType,
        renderSource: 'renderSource' in context ? context.renderSource : undefined,
    });
};
