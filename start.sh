#!/bin/sh
# Start script for Railway deployment
# This runs migrations and starts both services with PM2

# Don't exit on error - we want to start services even if migrations fail
# set -e

echo "🚀 Starting Study Institute Application..."

# Wait for DATABASE_URL to be available (with retry logic)
echo "⏳ Waiting for database configuration..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ -z "$DATABASE_URL" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "   Attempt $RETRY_COUNT/$MAX_RETRIES: DATABASE_URL not found, waiting..."
  sleep 2
done

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo "   Please add DATABASE_URL to your Railway service variables."
  echo "   You can link your PostgreSQL service via: Settings → Variables → Add Reference"
  echo "   The application will start but database features will not work."
  echo ""
  echo "⚠️  Starting services without database migrations..."
else
  echo "✅ DATABASE_URL found!"
  
  # Run Prisma migrations
  echo "📦 Running database migrations..."
  cd /app/backend
  
  # Try to run migrations with retry logic
  MIGRATION_RETRIES=5
  MIGRATION_COUNT=0
  MIGRATION_SUCCESS=false
  
  while [ $MIGRATION_COUNT -lt $MIGRATION_RETRIES ] && [ "$MIGRATION_SUCCESS" = false ]; do
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    echo "   Migration attempt $MIGRATION_COUNT/$MIGRATION_RETRIES..."
    
      if npx prisma migrate deploy; then
      MIGRATION_SUCCESS=true
      echo "✅ Database migrations completed successfully!"
      
      # Run database seeding to create admin user
      echo "🌱 Seeding database..."
      if npx prisma db seed; then
        echo "✅ Database seeding completed!"
      else
        echo "⚠️  Database seeding failed, but continuing..."
      fi
    else
      if [ $MIGRATION_COUNT -lt $MIGRATION_RETRIES ]; then
        echo "   Migration failed, retrying in 3 seconds..."
        sleep 3
      else
        echo "❌ ERROR: Database migrations failed after $MIGRATION_RETRIES attempts"
        echo "   Please check your DATABASE_URL and database connection."
        echo "   The application will start but may not work correctly."
      fi
    fi
  done
fi

# Verify required files exist before starting
echo "🔍 Verifying required files..."
if [ -f "/app/backend/dist/main.js" ]; then
  echo "✅ Found: /app/backend/dist/main.js"
elif [ -f "/app/backend/dist/src/main.js" ]; then
  echo "✅ Found: /app/backend/dist/src/main.js"
else
  echo "❌ CRITICAL ERROR: main.js not found in expected locations!"
  echo "   Checked: /app/backend/dist/main.js"
  echo "   Checked: /app/backend/dist/src/main.js"
  echo "   This usually means the build failed or files weren't copied correctly."
  echo "   Please check the Docker build logs."
  echo ""
  echo "   Directory structure:"
  ls -la /app/backend/ || echo "   /app/backend directory doesn't exist!"
  echo ""
  echo "   Dist directory contents:"
  ls -la /app/backend/dist/ || echo "   /app/backend/dist directory doesn't exist!"
  echo ""
  echo "   Searching for main.js:"
  find /app/backend -name "main.js" -type f 2>/dev/null || echo "   main.js not found anywhere!"
  exit 1
fi

if [ ! -d "/app/frontend/.next" ]; then
  echo "⚠️  WARNING: /app/frontend/.next not found!"
  echo "   Frontend may not work correctly."
fi

echo "✅ Required files verified!"

# Stop any existing PM2 processes to avoid port conflicts
echo "🛑 Stopping any existing PM2 processes..."
cd /app

# Stop PM2 daemon if running
pm2 kill 2>/dev/null || true
sleep 1

# Delete all PM2 processes
pm2 delete all 2>/dev/null || true
sleep 1

# Kill any Node.js processes that might be using the ports
echo "🔍 Checking for processes using backend port (3001)..."
if command -v lsof >/dev/null 2>&1; then
  # Kill processes on port 3001
  lsof -ti:3001 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  # Also kill any node processes that might be holding the port
  pkill -f "node.*backend.*dist/main" 2>/dev/null || true
elif command -v fuser >/dev/null 2>&1; then
  fuser -k 3001/tcp 2>/dev/null || true
fi

# Wait a bit more to ensure ports are released
sleep 3

# Verify port is free
echo "✅ Port cleanup completed"

# Validate PORT environment variable
echo "🔍 Validating PORT environment variable..."
if [ -n "$PORT" ] && [ "$PORT" != "3000" ]; then
  echo "⚠️  WARNING: PORT is set to '$PORT' but should be '3000'"
  echo "   Railway routes traffic to the PORT environment variable."
  echo "   Frontend listens on port 3000, so PORT must be 3000."
  echo "   Please update PORT=3000 in Railway environment variables."
  echo ""
  echo "   Current PORT: $PORT"
  echo "   Expected PORT: 3000"
  echo ""
  echo "   Continuing anyway, but Railway may not route traffic correctly..."
  echo ""
fi

# Start both services with PM2
echo "🎯 Starting backend and frontend services..."
echo "   Backend will use port: 3001 (internal, fixed)"
echo "   Frontend will use port: 3000 (fixed)"
echo ""
echo "   Environment variables:"
echo "   - PORT=${PORT:-not set} (Railway's PORT, should be 3000)"
echo "   - BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL:-http://localhost:3001}"
echo "   - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}"
echo ""
if [ -z "$PORT" ] || [ "$PORT" != "3000" ]; then
  echo "   ⚠️  CRITICAL: Set PORT=3000 in Railway environment variables"
  echo "   Frontend listens on port 3000, Railway must route traffic to PORT=3000"
  echo ""
fi

cd /app
# Export PORT for reference (frontend uses fixed 3000, but Railway should set PORT=3000)
export PORT=${PORT:-3000}

# Start both services with PM2 runtime
# PM2 runtime will keep the container alive and manage both processes
echo "🚀 Starting services with PM2 runtime..."
echo "   Services will be available at:"
echo "   - Backend: http://localhost:3001/api"
echo "   - Frontend: http://localhost:3000"
echo "   - Health check: http://localhost:3000/health"
echo ""
exec pm2-runtime start ecosystem.config.js

