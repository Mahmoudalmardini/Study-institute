// PM2 Ecosystem Configuration for Backend + Frontend
// Optimized for Next.js standalone output

module.exports = {
  apps: [
    // ========================================================================
    // Backend (NestJS)
    // ========================================================================
    {
      name: 'backend',
      cwd: '/app/backend',
      script: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // Startup configuration
      wait_ready: true,
      listen_timeout: 30000,
      kill_timeout: 5000,
      // Restart policy
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 3000,
      // Logging
      error_file: '/tmp/backend-error.log',
      out_file: '/tmp/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    
    // ========================================================================
    // Frontend (Next.js Standalone)
    // ========================================================================
    {
      name: 'frontend',
      cwd: '/app/frontend',
      // Use Next.js standalone server
      script: 'server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
        // Backend connection
        BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
      },
      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      // Startup configuration (wait for backend)
      wait_ready: false,
      listen_timeout: 60000,
      kill_timeout: 5000,
      // Restart policy
      max_restarts: 5,
      min_uptime: '15s',
      restart_delay: 3000,
      // Logging
      error_file: '/tmp/frontend-error.log',
      out_file: '/tmp/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};

