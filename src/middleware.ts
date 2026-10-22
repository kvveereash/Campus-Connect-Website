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
        '/forbidden',   // explains a permission problem; needs no permission
        '/verify-email', // opened from an email client, often with no session
        // Reading the feed needs no account, the same as /events and /clubs.
        // Writing to it still does: createClubPost checks membership on the
        // server, and the composer is only rendered for a signed-in member.
        '/buzz',
    ];

    // Check if current path is public (exact match or starts with for API routes)
    const isPublicPath = publicPaths.some((path) =>
        pathname === path || pathname.startsWith(path + '/')
    );

    const isApiRoute = pathname.startsWith('/api/');

    /**
     * Routes that require a logged-in user.
     *
     * Note `/profile` is matched exactly: your own profile needs a session, but
     * `/profile/[id]` is a public page anyone can view.
     */
    const isProtectedPath =
        pathname === '/profile' ||
        pathname === '/settings' ||
        pathname === '/my-events' ||
        pathname.startsWith('/messages') ||
        pathname.startsWith('/team-finder') ||
        pathname.startsWith('/admin') ||
        pathname === '/events/create' ||
        pathname === '/clubs/create' ||
        /^\/events\/[^/]+\/(edit|check-in|attendees)$/.test(pathname);

    if (!isPublicPath && !isApiRoute) {
        const session = await getSessionFromRequest(request);

        // Send anonymous visitors to log in, remembering where they were headed.
        if (isProtectedPath && !session) {
            const loginUrl = new URL('/login', request.url);
            // With the query: a ticket scanned while signed out (?t=...) must
            // still be on the door page after logging in.
            loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);

            /* A session cookie that no longer validates is a different event
               from never having signed in, and it is the more confusing one:
               you were using the site, and now it is asking who you are. The
               login page says so when this is set, rather than presenting a
               bare form as though you had arrived cold. */
            if (request.cookies.get('session')?.value) {
                loginUrl.searchParams.set('reason', 'expired');
            }

            return NextResponse.redirect(loginUrl);
        }

        // Admin-only routes need the role on top of a session.
        if (pathname.startsWith('/admin') && session?.user?.role !== 'ADMIN') {
            logger.warn('Forbidden: Non-admin attempted admin access', {
                requestId,
                userId: session?.userId,
                path: pathname,
            });
            /* Was a silent redirect to /events: nothing explained, and it read
               as a broken link rather than a permission you do not have. */
            return NextResponse.redirect(new URL('/forbidden', request.url));
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
         * - _next/webpack-hmr (the dev server's websocket: running here
         *   swallowed the upgrade, so the page reloaded in a loop)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
