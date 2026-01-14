import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Terser for minification instead of SWC (more reliable for circular dependencies)
  swcMinify: false,
  
  // Skip ESLint during build (for production deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript type checking during build (for production deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimize production build to prevent circular dependency errors
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
    // Use loose mode for ESM externals
    esmExternals: 'loose',
  },
  
  // Optimize imports to prevent circular dependencies
  modularizeImports: {
    '@/components': {
      transform: '@/components/{{member}}',
    },
    '@/lib': {
      transform: '@/lib/{{member}}',
    },
  },
  
  // Configure webpack to better handle circular dependencies
  webpack: (config, { isServer, dev }) => {
    // Fix for "Cannot access before initialization" errors in production
    if (!isServer && !dev) {
      // Use named modules for better debugging
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        // Don't use runtime chunk to avoid cross-chunk dependencies
        runtimeChunk: false,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React, Next.js)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Vendor chunk for other node_modules
            lib: {
              test(module: any) {
                return (
                  module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier())
                );
              },
              name(module: any) {
                const hash = require('crypto')
                  .createHash('sha1')
                  .update(module.identifier())
                  .digest('hex')
                  .substring(0, 8);
                return `lib-${hash}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
            shared: {
              name: false,
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
        // Ensure consistent module concatenation
        concatenateModules: true,
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
