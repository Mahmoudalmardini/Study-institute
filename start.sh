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

# Start both services with PM2
echo "🎯 Starting backend and frontend services..."
cd /app
exec pm2-runtime start ecosystem.config.js

