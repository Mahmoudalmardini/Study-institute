import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ============================================================================
  // CRITICAL: Use standalone output for production
  // This creates an optimized, self-contained build with only necessary dependencies
  // ============================================================================
  output: 'standalone',
  
  // Skip linting and type checking during build (done in CI/CD)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ============================================================================
  // API Rewrites for Backend Proxy
  // ============================================================================
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  
  // ============================================================================
  // Image Configuration
  // ============================================================================
  images: {
    domains: ['localhost'],
    unoptimized: true, // Disable image optimization for Railway
  },
  
  // ============================================================================
  // Compiler Options
  // ============================================================================
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;

