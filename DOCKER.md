# Docker Deployment Guide

This guide covers how to run the Study Institute application using Docker for both local development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Development)](#quick-start-development)
- [Production Deployment](#production-deployment)
- [Docker Architecture](#docker-architecture)
- [Environment Configuration](#environment-configuration)
- [Commands Reference](#commands-reference)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository

### Installing Docker

- **Windows/Mac**: Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow the [official Docker installation guide](https://docs.docker.com/engine/install/)

## Quick Start (Development)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd study-institute
```

### 2. Start All Services

```bash
docker-compose up -d
```

This command will:
- Start PostgreSQL database
- Start Redis cache
- Build and start the backend API (with hot reload)
- Build and start the frontend (with hot reload)

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Stop the Application

```bash
docker-compose down
```

To remove volumes as well (database data will be lost):

```bash
docker-compose down -v
```

## Production Deployment

### 1. Create Production Environment File

Create a `.env.production` file in the root directory:

```bash
# Copy the example file
cp .env.production.example .env.production
```

Edit `.env.production` with your production values:

```env
# Database Configuration
POSTGRES_DB=study_institute
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_database_password_here
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password_here

# Backend Configuration
BACKEND_PORT=3001
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRATION=7d

# Frontend Configuration
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Nginx Configuration (if using nginx)
HTTP_PORT=80
HTTPS_PORT=443
```

### 2. Deploy Without Nginx

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 3. Deploy With Nginx Reverse Proxy

First, configure SSL certificates (recommended for production):

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp /path/to/your/cert.pem nginx/ssl/
cp /path/to/your/key.pem nginx/ssl/
```

Update `nginx/nginx.conf` to uncomment the HTTPS server block, then:

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production --profile with-nginx up -d
```

### 4. Production Health Checks

```bash
# Check all services status
docker-compose -f docker-compose.prod.yml ps

# Check backend health
curl http://localhost:3001/health

# Check frontend health
curl http://localhost:3000
```

## Docker Architecture

### Multi-Stage Builds

Both backend and frontend use multi-stage Docker builds:

1. **Development Stage**: Full development environment with hot reload
2. **Build Stage**: Compiles and builds the application
3. **Production Stage**: Minimal production image with only runtime dependencies

### Services Overview

#### PostgreSQL
- **Image**: `postgres:16-alpine`
- **Port**: 5432
- **Volume**: `postgres_data` for data persistence
- **Health Check**: Runs every 10 seconds

#### Redis
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Volume**: `redis_data` for data persistence
- **Health Check**: Runs every 10 seconds

#### Backend (NestJS)
- **Dev Port**: 3001
- **Features**:
  - Hot reload in development
  - Automatic Prisma migration on startup
  - Health check endpoint
  - Non-root user in production
  - Read-only filesystem in production

#### Frontend (Next.js)
- **Dev Port**: 3000
- **Features**:
  - Hot reload in development
  - Optimized production build
  - Health check endpoint
  - Non-root user in production

#### Nginx (Optional)
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Features**:
  - Reverse proxy for backend and frontend
  - Rate limiting
  - SSL/TLS termination
  - Gzip compression
  - Security headers

## Environment Configuration

### Development Environment

Development uses `docker-compose.yml` with environment variables defined inline:

- Database credentials are for development only
- Hot reload enabled for both frontend and backend
- Source code mounted as volumes
- Debug logging enabled

### Production Environment

Production uses `docker-compose.prod.yml` with environment variables from `.env.production`:

- Secure credentials required
- Optimized builds
- Security features enabled (non-root users, read-only filesystem)
- Health checks enabled
- Resource limits (can be configured)

## Commands Reference

### Development Commands

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Rebuild services (after dependency changes)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Execute commands in running container
docker-compose exec backend sh
docker-compose exec backend npx prisma studio

# Run database migrations
docker-compose exec backend npx prisma migrate dev

# Restart a service
docker-compose restart backend
```

### Production Commands

```bash
# Deploy production stack
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production stack
docker-compose -f docker-compose.prod.yml down

# Update to latest version
git pull
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres study_institute > backup.sql

# Database restore
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres study_institute
```

### Maintenance Commands

```bash
# Clean up unused Docker resources
docker system prune -a

# View disk usage
docker system df

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Troubleshooting

### Services Won't Start

**Issue**: Docker services fail to start

**Solutions**:
1. Check Docker is running: `docker info`
2. Check logs: `docker-compose logs`
3. Ensure ports are not in use: `netstat -an | grep 3000`
4. Try rebuilding: `docker-compose up -d --build`

### Database Connection Issues

**Issue**: Backend can't connect to PostgreSQL

**Solutions**:
1. Check database is healthy: `docker-compose ps postgres`
2. Verify DATABASE_URL in backend environment
3. Wait for health check: `docker-compose logs postgres`
4. Restart backend: `docker-compose restart backend`

### Hot Reload Not Working

**Issue**: Changes not reflected in development

**Solutions**:
1. Check volume mounts in `docker-compose.yml`
2. On Windows: Ensure file sharing is enabled in Docker Desktop
3. Restart the service: `docker-compose restart backend`
4. Try `docker-compose down -v && docker-compose up -d`

### Permission Issues

**Issue**: Permission denied errors in containers

**Solutions**:
1. In production, containers run as non-root users
2. Ensure volumes have correct permissions
3. Check container user: `docker-compose exec backend whoami`

### Out of Memory

**Issue**: Services crashing due to memory

**Solutions**:
1. Increase Docker memory limit (Docker Desktop settings)
2. Add memory limits to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### SSL Certificate Issues

**Issue**: HTTPS not working with Nginx

**Solutions**:
1. Verify certificates exist in `nginx/ssl/`
2. Check certificate validity: `openssl x509 -in cert.pem -text`
3. Ensure nginx.conf HTTPS block is uncommented
4. Check nginx logs: `docker-compose logs nginx`

## Best Practices

### Development

1. **Don't commit .env files**: Keep credentials secure
2. **Use volumes**: Source code should be mounted for hot reload
3. **Monitor resources**: Use `docker stats` to monitor resource usage
4. **Regular cleanup**: Run `docker system prune` periodically

### Production

1. **Use strong secrets**: Generate secure passwords and JWT secrets
2. **Enable SSL/TLS**: Always use HTTPS in production
3. **Regular backups**: Backup database regularly
4. **Monitor health**: Set up monitoring for health check endpoints
5. **Update regularly**: Keep Docker images updated
6. **Use .dockerignore**: Reduce build context size
7. **Multi-stage builds**: Keep production images small
8. **Non-root users**: Run containers as non-root
9. **Read-only filesystem**: Enable where possible
10. **Resource limits**: Set appropriate memory and CPU limits

### Security

1. **Secrets management**: Use Docker secrets or environment variables from secure sources
2. **Network isolation**: Use Docker networks to isolate services
3. **Regular updates**: Keep base images and dependencies updated
4. **Scan images**: Use `docker scan` to check for vulnerabilities
5. **Limit exposure**: Only expose necessary ports
6. **Use private registry**: For production, use a private Docker registry

### Performance

1. **Layer caching**: Order Dockerfile commands to maximize cache hits
2. **Multi-stage builds**: Keep production images minimal
3. **Health checks**: Configure appropriate intervals and timeouts
4. **Resource limits**: Prevent services from consuming all resources
5. **Persistent volumes**: Use volumes for database data

## Advanced Configuration

### Custom Network Configuration

```yaml
networks:
  study-institute-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Logging Configuration

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review this documentation
3. Check Docker documentation: https://docs.docker.com
4. Open an issue in the repository

## License

This project is licensed under the terms specified in the LICENSE file.

