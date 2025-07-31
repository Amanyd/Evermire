import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds for prototype development
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
