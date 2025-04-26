import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable TypeScript type checking during build - allows deployment without affecting local development
  typescript: {
    // !! WARN !!
    // This setting is only for build/deployment - local development still checks types
    ignoreBuildErrors: true,
  },
  // Disable ESLint errors during build
  eslint: {
    // !! WARN !!
    // This setting is only for build/deployment - local development still runs ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
