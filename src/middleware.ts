import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-edge';
import { logger, generateRequestId } from '@/lib/logger';

/**
 * Middleware runs on every request
 * Handles authentication and request logging
 */
export async function middleware(request: NextRequest) {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;

    // 1. Trace Check: Use existing or generate new request ID
    const requestHeaders = new Headers(request.headers);
    let requestId = requestHeaders.get('x-request-id');

    if (!requestId) {
        requestId = generateRequestId();
        requestHeaders.set('x-request-id', requestId);
    }

    // Log incoming request
    logger.request(request.method, pathname, { requestId });

    // Public routes that don't require authentication
    const publicPaths = [
        '/login',
        '/signup',
        '/', // Landing page
        '/api/webhooks', // Webhook endpoints (verified separately)
        '/api/health',   // Health check endpoint for monitoring
        '/forgot-password',
        '/reset-password',
    ];

    // Check if current path is public (exact match or starts with for API routes)
    const isPublicPath = publicPaths.some((path) =>
        pathname === path || pathname.startsWith(path + '/')
    );

    const isApiRoute = pathname.startsWith('/api/');

    // Optional auth extraction for logging or admin checks
    if (!isPublicPath && !isApiRoute) {
        const session = await getSessionFromRequest(request);

        // Admin-only routes
        if (pathname.startsWith('/admin')) {
            if (!session) {
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('redirect', pathname);
                return NextResponse.redirect(loginUrl);
            }
            if (session.user?.role !== 'ADMIN') {
                logger.warn('Forbidden: Non-admin attempted admin access', {
                    requestId,
                    userId: session.userId,
                    path: pathname,
                });
                return NextResponse.redirect(new URL('/events', request.url));
            }
        }

        if (session) {
            logger.info('Authenticated request', {
                requestId,
                userId: session.userId,
                path: pathname,
            });
        }
    }

    // Pass the headers to downstream
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Set Trace ID in response header for client debugging
    response.headers.set('x-request-id', requestId);

    // Log response with duration
    const duration = Date.now() - startTime;
    logger.response(request.method, pathname, response.status, duration, { requestId });

    return response;
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
