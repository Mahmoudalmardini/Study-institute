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
    // Backend uses fixed internal port 3001
    // The backend will start first and use port 3001 (or 3002 if 3001 is unavailable)
    // Frontend will proxy to the backend
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
