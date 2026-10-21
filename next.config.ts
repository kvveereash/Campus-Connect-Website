import type { NextConfig } from "next";

// Security headers for production
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
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
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
];

function supabaseImagePattern() {
  try {
    const url = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;
    if (!url || url.hostname.endsWith('.supabase.co')) return [];
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
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      // Uploaded files (src/lib/storage.ts), public buckets only.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // A custom or self-hosted Supabase domain, read from the build env.
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
