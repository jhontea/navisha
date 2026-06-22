/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  // This produces a self-contained build in .next/standalone
  output: 'standalone',
  // Disable ESLint during production build (errors are checked in CI/dev)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during build (type-check separately)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
