import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during build (for production deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript type checking during build (for production deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Rewrite API requests to backend (for Railway deployment)
  async rewrites() {
    // Get backend URL from environment or use localhost
    // Backend will try ports 3001, 3002, 3003, etc. if 3001 is in use
    const backendPort = process.env.BACKEND_PORT || '3001';
    const backendUrl = process.env.BACKEND_INTERNAL_URL || `http://localhost:${backendPort}`;
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
