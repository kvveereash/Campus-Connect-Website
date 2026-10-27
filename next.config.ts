import type { NextConfig } from "next";

// Security headers for production
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  // '0', not '1; mode=block': the old XSS auditor is gone from browsers and
  // its blocking mode could itself be abused to break pages.
  {
    key: 'X-XSS-Protection',
    value: '0'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin'
  },
  /* The Content-Security-Policy limits the damage of any future XSS bug.
     Enforced since Oct 22, after it ran report-only with a clean console on
     the live site (every resource there is same-origin; images come through
     /_next/image). 'unsafe-inline' in script-src is needed for Next's inline
     bootstrap scripts: a nonce would force every page to render per request.
     'unsafe-eval' is development only, where React's dev build needs it.
     tile.openstreetmap.org is the Venues map's tiles (images only). */
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://ui-avatars.com https://tile.openstreetmap.org",
      "font-src 'self'",
      "connect-src 'self' https://*.pusher.com wss://*.pusher.com",
      "worker-src 'self'",
      "manifest-src 'self'",
      // 'self' (was 'none') so the widget preview in EmbedCode can show
      // this site's own /embed pages. No other origin may be framed.
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // No upgrade-insecure-requests: Netlify serves only https with HSTS, so
      // it gains nothing there, and it broke `next start` over plain http.
    ].join('; ')
  },
];

/* /embed/* is the events widget other websites put in an iframe
   (public/embed.js), so it cannot carry the rules above: X-Frame-Options and
   frame-ancestors 'self' are exactly what stop it showing anywhere else. It
   gets its own, stricter policy instead. The documents there are plain HTML
   with inline CSS and one inline script (src/lib/embed.ts), no images, fonts
   or requests, so everything else is 'none'; frame-ancestors * is the one
   permission they need. Links open in a new tab, which form-action and
   base-uri do not touch. */
const embedHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'none'",
      "style-src 'unsafe-inline'",
      "script-src 'unsafe-inline'",
      "img-src 'self' data:",
      "frame-ancestors *",
      "base-uri 'none'",
      "form-action 'none'",
    ].join('; ')
  },
];

function supabaseImagePattern() {
  try {
    const url = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;
    if (!url) {
      return [{ protocol: 'https' as const, hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }];
    }
    return [{
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      hostname: url.hostname,
      pathname: '/storage/v1/object/public/**',
    }];
  } catch {
    return [];
  }
}

// NOTE: Do not add a `env: {...}` block here for secrets. Next.js inlines those
// values into the build output at compile time, which bakes them into artifacts
// and risks leaking any that a client component happens to reference. Server
// code reads process.env at runtime on Netlify already — set the values in the
// Netlify dashboard (Site settings → Environment variables) instead.
const nextConfig: NextConfig = {
  // No 'X-Powered-By: Next.js' header: it only tells a scanner what to try.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      // Uploaded files (src/lib/storage.ts): only our own project's public
      // buckets. '*.supabase.co' let any Supabase project's images through
      // our image optimiser. Falls back to the wildcard only if SUPABASE_URL
      // is missing at build time.
      ...supabaseImagePattern(),
    ],
    // Image optimization settings
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Security headers
  async headers() {
    return [
      {
        // Every path except /embed/*, which may be framed by any site and
        // gets embedHeaders below. Two rules that never overlap, so neither
        // has to undo the other's X-Frame-Options or CSP.
        source: '/:path((?!embed/).*)',
        headers: securityHeaders,
      },
      {
        source: '/embed/:path+',
        headers: embedHeaders,
      },
    ];
  },
  // Retired duplicate routes — keep old links working.
  async redirects() {
    return [
      { source: '/leaderboard', destination: '/leaderboards', permanent: true },
      { source: '/chat', destination: '/messages', permanent: true },
      { source: '/user/:id', destination: '/profile/:id', permanent: true },
    ];
  },
};

export default nextConfig;


// Trigger rebuild
