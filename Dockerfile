# Combined Dockerfile for Backend + Frontend
# This allows running both services in a single Railway service

# Stage 1: Build Backend
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install backend dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Build backend
RUN npm run build

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production - Combined Runtime
FROM node:20-alpine AS production

# Install dumb-init and PM2 for process management
RUN apk add --no-cache dumb-init && \
    npm install -g pm2

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# Copy backend built files
COPY --from=backend-build --chown=appuser:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-build --chown=appuser:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build --chown=appuser:nodejs /app/backend/package*.json ./backend/
COPY --from=backend-build --chown=appuser:nodejs /app/backend/prisma ./backend/prisma/

# Copy frontend built files
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/.next ./frontend/.next
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/public ./frontend/public
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/package*.json ./frontend/
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/next.config.ts ./frontend/
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/node_modules ./frontend/node_modules

# Copy PM2 ecosystem file and start script
COPY --chown=appuser:nodejs ecosystem.config.js ./
COPY --chown=appuser:nodejs start.sh ./
RUN chmod +x start.sh

# Generate Prisma Client in production
WORKDIR /app/backend
RUN npx prisma generate

# Switch to non-root user
USER appuser

# Expose ports (backend: 3001, frontend: 3000)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start both services with PM2
# Prisma migrations will run via Railway start command override
WORKDIR /app
CMD ["./start.sh"]

