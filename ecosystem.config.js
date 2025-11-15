// PM2 ecosystem file for running both backend and frontend
// Railway sets PORT automatically - we'll use it for backend, frontend uses different port

// Get PORT from environment (Railway sets this)
const railwayPort = process.env.PORT || '3000';

module.exports = {
  apps: [
    {
      name: 'backend',
      // Start backend first to ensure it gets port 3001
      autorestart: true,
      watch: false,
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
        // Backend uses fixed internal port 3001
        // This port should not conflict with Railway's PORT (which is for frontend)
        PORT: 3001,
      },
      // Ensure backend starts first
      wait_ready: true,
      listen_timeout: 30000,
      // Prevent PM2 from starting multiple instances
      instances: 1,
      exec_mode: 'fork',
      error_file: '/tmp/backend-error.log',
      out_file: '/tmp/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      kill_timeout: 10000,
      // Limit restarts to prevent infinite loops
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'frontend',
      cwd: '/app/frontend',
      script: 'node_modules/.bin/next',
      // Use -p to explicitly set port, -H to bind to 0.0.0.0
      args: `start -p ${railwayPort} -H 0.0.0.0`,
      // Start frontend after a short delay to ensure backend is ready
      wait_ready: false,
      // Add a small startup delay
      min_uptime: '5s',
      // PM2 automatically passes all environment variables from parent process
      env: {
        NODE_ENV: 'production',
        // Frontend MUST use Railway's PORT (this is what Railway routes traffic to)
        // Use the PORT that Railway sets (captured at config load time)
        PORT: railwayPort,
        // Backend is on fixed port 3001
        BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
        HOSTNAME: '0.0.0.0',
      },
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

