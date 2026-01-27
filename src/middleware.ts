import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

/**
 * Middleware runs on every request
 * Handles authentication and request logging
 */
export async function middleware(request: NextRequest) {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;
    const requestId = generateRequestId();

    // Log incoming request
    logger.request(request.method, pathname, { requestId });

    // AUTHENTICATION TEMPORARILY DISABLED FOR DEBUGGING LOGIN ISSUE
    /*
    // Public routes that don't require authentication
    const publicPaths = [
        '/login',
        '/signup',
        '/', // Landing page
    ];

    // Check if current path is public
    const isPublicPath = publicPaths.some((path) => pathname === path);

    // If not a public path, require authentication
    if (!isPublicPath) {
        const session = await getSession();

        if (!session) {
            // Redirect to login if not authenticated
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);

            logger.warn('Unauthorized access attempt - redirecting to login', {
                requestId,
                path: pathname,
                redirectTo: '/login',
            });

            return NextResponse.redirect(loginUrl);
        }

        // Admin-only routes
        if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
            logger.warn('Forbidden: Non-admin attempted admin access', {
                requestId,
                userId: session.user.id,
                email: session.user.email,
                path: pathname,
            });

            return NextResponse.redirect(new URL('/events', request.url));
        }

        logger.info('Authenticated request', {
            requestId,
            userId: session.user.id,
            email: session.user.email,
            path: pathname,
        });
    }
    */

    const response = NextResponse.next();

    // Log response with duration
    const duration = Date.now() - startTime;
    logger.response(request.method, pathname, 200, duration, { requestId });

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
