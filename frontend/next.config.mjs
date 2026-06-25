/** @type {import('next').NextConfig} */
const nextConfig = {
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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
};

export default nextConfig;
