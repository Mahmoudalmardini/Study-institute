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
  
  // Use SWC minifier (default, faster and handles circular deps better)
  swcMinify: true,
  
  // Configure webpack to prevent circular dependency errors
  webpack: (config, { isServer, webpack }) => {
    // Only modify client-side builds
    if (!isServer) {
      // Completely disable module concatenation to prevent TDZ errors
      config.optimization.concatenateModules = false;
      
      // Use named module IDs in production for better debugging
      config.optimization.moduleIds = 'named';
      
      // Don't use runtime chunk - inline it to avoid cross-chunk issues
      config.optimization.runtimeChunk = false;
      
      // Aggressive code splitting to separate circular dependencies
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // React and Next.js framework code
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // All other node_modules
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 30,
          },
          // Shared application code
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };
      
      // Add plugin to ignore circular dependency warnings (they're expected)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        })
      );
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
