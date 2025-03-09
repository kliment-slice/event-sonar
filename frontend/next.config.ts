import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://event-sonar.fly.dev/api/:path*', // Update to match the actual URL
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // This will disable image optimization
  },
  experimental: {
    serverActions: {}, // Empty object instead of true to match the expected type
  }
};

export default nextConfig;