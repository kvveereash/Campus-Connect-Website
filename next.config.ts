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
  /* A Content-Security-Policy limits the damage of any future XSS bug. It is
     sent as Report-Only first: browsers log violations in the console but
     block nothing, so a missed source cannot break the site. Once the console
     stays clean, rename the key to 'Content-Security-Policy' to enforce it.
     'unsafe-inline' in script-src is needed for Next's inline bootstrap and
     theme scripts (a nonce would force every page to render dynamically). */
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://ui-avatars.com",
      "font-src 'self'",
      "connect-src 'self' https://*.pusher.com wss://*.pusher.com",
      "worker-src 'self'",
      "manifest-src 'self'",
      "frame-src 'none'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
        source: '/:path*',
        headers: securityHeaders,
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
