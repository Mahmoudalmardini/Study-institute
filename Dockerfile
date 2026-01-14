# Combined Dockerfile for Backend + Frontend
# Optimized for Railway deployment with Next.js standalone output

# ============================================================================
# Stage 1: Build Backend
# ============================================================================
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps --omit=dev

# Copy backend source
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Build backend
RUN npm run build

# ============================================================================
# Stage 2: Build Frontend with Standalone Output
# ============================================================================
FROM node:20-alpine AS frontend-build

# CACHE BUST: Force rebuild - 2026-01-15-standalone
ARG CACHEBUST=2026-01-15-standalone-v2
RUN echo "Cache bust: $CACHEBUST"

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend with standalone output
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================================================
# Stage 3: Production Runtime
# ============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    tini \
    && npm install -g pm2

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# ============================================================================
# Copy Backend Files
# ============================================================================
COPY --from=backend-build --chown=appuser:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-build --chown=appuser:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build --chown=appuser:nodejs /app/backend/package*.json ./backend/
COPY --from=backend-build --chown=appuser:nodejs /app/backend/prisma ./backend/prisma/

# ============================================================================
# Copy Frontend Files (Standalone Output)
# ============================================================================
# Copy standalone server (optimized, includes only necessary code)
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/.next/standalone ./frontend/

# Copy static files to the correct location within standalone
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/public ./frontend/public

# Copy next.config (might be needed for runtime)
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/next.config.ts ./frontend/next.config.ts

# ============================================================================
# Copy Startup Scripts
# ============================================================================
COPY --chown=appuser:nodejs ecosystem.config.js ./
COPY --chown=appuser:nodejs start.sh ./
RUN chmod +x start.sh

# ============================================================================
# Generate Prisma Client in Production
# ============================================================================
WORKDIR /app/backend
RUN npx prisma generate

# ============================================================================
# Switch to Non-Root User
# ============================================================================
USER appuser

# ============================================================================
# Configuration
# ============================================================================
WORKDIR /app

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start services
CMD ["./start.sh"]

