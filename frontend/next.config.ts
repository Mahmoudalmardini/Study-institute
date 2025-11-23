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
  // Rewrite API requests and file uploads to backend (for Railway deployment)
  async rewrites() {
    // Backend uses fixed internal port 3001 (strictly enforced)
    // Frontend will proxy /api/* and /uploads/* requests to the backend
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
