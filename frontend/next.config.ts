import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Add image optimization configuration
  images: {
    unoptimized: true, // This will disable image optimization
  },
  // Fix the serverActions configuration
  experimental: {
    serverActions: {},
  }
};

export default nextConfig;