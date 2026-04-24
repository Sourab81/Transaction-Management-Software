import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://techsouls.in/enest_api/api/:path*',
      },
    ];
  },
};

export default nextConfig;
