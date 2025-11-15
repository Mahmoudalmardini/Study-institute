// PM2 ecosystem file for running both backend and frontend
// Railway sets PORT automatically - we'll use it for frontend, backend uses BACKEND_PORT
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
        PORT: process.env.BACKEND_PORT || 3001,
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
        PORT: process.env.PORT || 3000, // Railway's PORT for frontend
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

