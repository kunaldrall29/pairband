import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pairband/config", "@pairband/domain"],
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.API_REWRITE_TARGET ?? "http://127.0.0.1:3001";
    return [{ source: "/api/:path*", destination: `${target}/:path*` }];
  },
};

export default nextConfig;
