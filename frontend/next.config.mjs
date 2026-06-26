/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React StrictMode in development — it double-mounts components
  // which causes LLM mutations (summary, generate) to fire multiple times
  // on a single user click.
  reactStrictMode: false,
  // Enable standalone output for Docker deployment
  // This produces a self-contained build in .next/standalone
  output: 'standalone',
  // ESLint errors are caught in CI (npm run lint) and pre-commit hook.
  // Keep disabled during build to avoid double-checking.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Do NOT ignore TypeScript errors — the codebase has clean types.
  // Build should fail if a type error slips through.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking by blocking all framing
          { key: 'X-Frame-Options', value: 'DENY' },
          // Limit referrer information on cross-origin requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Content-Security-Policy: restrict script/style/font sources.
          // 'unsafe-inline' and 'unsafe-eval' are required by Next.js 14's
          // development mode and the Google Maps JS API loader.
          // In production, consider using a nonce-based approach via _document.tsx.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com",
              "connect-src 'self' http://localhost:8090 https://*.navisha.cloud https://maps.googleapis.com https://*.googleapis.com",
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Report CSP violations for monitoring (optional endpoint)
              process.env.CSP_REPORT_URI
                ? `report-uri ${process.env.CSP_REPORT_URI}`
                : "",
            ].filter(Boolean).join('; '),
          },
          // CSP Report-Only: log violations without blocking.
          // Enable in staging first to audit before enforcing.
          ...(process.env.CSP_REPORT_ONLY === 'true'
            ? [{
                key: 'Content-Security-Policy-Report-Only',
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                  "font-src 'self' https://fonts.gstatic.com",
                  "img-src 'self' data: blob: https://*.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com",
                  "connect-src 'self' http://localhost:8090 https://*.navisha.cloud https://maps.googleapis.com https://*.googleapis.com",
                  "frame-src 'self' https://accounts.google.com",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                  process.env.CSP_REPORT_URI
                    ? `report-uri ${process.env.CSP_REPORT_URI}`
                    : "",
                ].filter(Boolean).join('; '),
              }]
            : []),
          // Legacy X-XSS-Protection (Loop 8: defense-in-depth for older browsers)
          // Chromium-based browsers ignore this; IE/older Edge use it as a
          // reflected-XSS filter.
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // HTTP Strict-Transport-Security (HSTS) — 2 years, include subdomains
          // Set only in production; omit in dev (localhost is HTTP)
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
          // Restrict which browser features can be used
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Prevent cross-origin leaks via window.opener
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Prevent cross-origin resource embedding
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
};

export default nextConfig;
