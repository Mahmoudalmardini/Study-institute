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
  
  // Disable telemetry
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // ============================================================================
  // Webpack Configuration to Fix Circular Dependencies
  // ============================================================================
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Disable module concatenation (scope hoisting) to prevent TDZ errors
      config.optimization.concatenateModules = false;
      
      // Use deterministic module IDs for consistent builds
      config.optimization.moduleIds = 'deterministic';
      
      // Simple code splitting strategy
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework bundle
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Libraries bundle
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 30,
          },
        },
      };
    }
    
    return config;
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
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
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

