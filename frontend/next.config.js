/** @type {import('next').NextConfig} */
//
// SECURITY headers — see CLAUDE.md "Authentication & Authorization" and the
// 2026-04-27 review for context. CSP currently allows 'unsafe-inline' for
// script-src because the pre-paint theme script in app/layout.tsx is inlined
// to avoid FOUC. Migrating to a nonce-based CSP (Next.js middleware pattern)
// is tracked as a follow-up — at that point drop 'unsafe-inline' from
// script-src. Style-src keeps 'unsafe-inline' for Tailwind + next/font.
//
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'),
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'echarts', 'date-fns'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
