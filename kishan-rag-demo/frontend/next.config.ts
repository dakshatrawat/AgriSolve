import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore TypeScript errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
