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
  
  // Configure webpack to prevent circular dependency errors
  webpack: (config, { isServer, dev }) => {
    // Only modify client-side production builds
    if (!isServer && !dev) {
      // Use simpler, more reliable optimization
      config.optimization = {
        ...config.optimization,
        // Use deterministic module IDs (consistent across builds)
        moduleIds: 'deterministic',
        // Single runtime chunk to avoid cross-chunk dependencies
        runtimeChunk: {
          name: 'runtime',
        },
        // Simplified code splitting
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // All vendor code in one chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 20,
            },
            // Common code shared between pages
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
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
