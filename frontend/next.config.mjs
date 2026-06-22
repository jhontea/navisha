/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  // This produces a self-contained build in .next/standalone
  output: 'standalone',
};

export default nextConfig;
