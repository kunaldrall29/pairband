import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pairband/config", "@pairband/domain"],
  reactStrictMode: true,
};

export default nextConfig;
