import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.png", permanent: false }];
  },
};

export default nextConfig;
