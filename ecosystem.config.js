// PM2 ecosystem file for running both backend and frontend
// Railway sets PORT automatically - we'll use it for backend, frontend uses different port
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/app/backend',
      // Try dist/main.js first, fallback to dist/src/main.js
      script: (() => {
        const fs = require('fs');
        const path = require('path');
        const mainJs = path.join(__dirname, 'backend', 'dist', 'main.js');
        const mainJsSrc = path.join(__dirname, 'backend', 'dist', 'src', 'main.js');
        
        if (fs.existsSync(mainJs)) {
          return mainJs;
        } else if (fs.existsSync(mainJsSrc)) {
          return mainJsSrc;
        } else {
          // Default fallback
          return mainJs;
        }
      })(),
      env: {
        NODE_ENV: 'production',
        // Backend uses internal port (Frontend will proxy /api/* to this)
        // Use a fixed internal port that won't conflict with Railway's PORT
        PORT: 3001,
      },
      // Prevent PM2 from starting multiple instances
      instances: 1,
      exec_mode: 'fork',
      error_file: '/tmp/backend-error.log',
      out_file: '/tmp/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Enable autorestart but with limits to prevent infinite loops
      autorestart: true,
      max_memory_restart: '500M',
      // Wait before restarting to avoid port conflicts
      wait_ready: true,
      listen_timeout: 30000,
      kill_timeout: 10000,
      // Limit restarts to prevent infinite loops
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'frontend',
      cwd: '/app/frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      // PM2 automatically passes all environment variables from parent process
      // But we explicitly set PORT to ensure Next.js uses Railway's PORT
      env: {
        NODE_ENV: 'production',
        // Frontend uses Railway's PORT (this is what Railway routes traffic to)
        // Next.js automatically uses PORT environment variable
        // PM2 will inherit PORT from parent process (Railway sets it)
        // Backend internal URL for rewrites (Next.js will proxy /api/* to this)
        BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
      },
      // PM2 will automatically pass PORT from parent process
      // No need to set it explicitly - it will be inherited
      // Prevent PM2 from starting multiple instances
      instances: 1,
      exec_mode: 'fork',
      error_file: '/tmp/frontend-error.log',
      out_file: '/tmp/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};

