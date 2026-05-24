import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Rewrites so web can call /api-proxy/* → API without CORS
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.PROMPTOPS_API_URL ?? 'http://localhost:3013'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
