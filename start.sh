#!/bin/sh
# Start script for Railway deployment
# This runs migrations and starts both services with PM2

set -e

echo "🚀 Starting Study Institute Application..."

# Run Prisma migrations
echo "📦 Running database migrations..."
cd /app/backend
npx prisma migrate deploy

# Start both services with PM2
echo "🎯 Starting backend and frontend services..."
cd /app
exec pm2-runtime start ecosystem.config.js

