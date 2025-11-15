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
        // Use Railway's PORT for backend (this is what Railway routes traffic to)
        PORT: process.env.PORT || 3001,
      },
      error_file: '/tmp/backend-error.log',
      out_file: '/tmp/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
    {
      name: 'frontend',
      cwd: '/app/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        // Frontend uses a different port (internal only, Railway routes to backend)
        PORT: process.env.FRONTEND_PORT || 3000,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      },
      error_file: '/tmp/frontend-error.log',
      out_file: '/tmp/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};

