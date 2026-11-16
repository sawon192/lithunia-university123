import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Arena live-preview proxy host to load dev assets.
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
