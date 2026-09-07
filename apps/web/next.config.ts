import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pairband/ui", "@pairband/config", "@pairband/domain"],
};

export default nextConfig;
