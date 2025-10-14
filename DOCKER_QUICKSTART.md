# Docker Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Start Docker Desktop
Make sure Docker Desktop is running on your machine.

### 2. Run the Application
```bash
docker-compose up -d
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

That's it! 🎉

---

## 📋 Common Commands

### Start/Stop
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart services
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### Access Service Shell
```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# Database
docker-compose exec postgres psql -U postgres study_institute
```

### Database Operations
```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec backend npx prisma studio

# Create database backup
docker-compose exec postgres pg_dump -U postgres study_institute > backup.sql
```

---

## 🎯 Using Makefile (Even Easier!)

If you prefer shortcuts:

```bash
# See all available commands
make help

# Common commands
make dev-up        # Start development
make dev-down      # Stop development
make dev-logs      # View logs
make dev-build     # Rebuild containers
make migrate-dev   # Run migrations
make studio        # Open Prisma Studio
```

---

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check Docker is running
docker info

# View error logs
docker-compose logs

# Try rebuilding
docker-compose down
docker-compose up -d --build
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Issues
```bash
# Wait for services to be healthy
docker-compose ps

# Restart backend
docker-compose restart backend
```

### Changes Not Reflected
```bash
# For code changes, hot reload should work automatically
# If not, restart the service:
docker-compose restart backend

# For dependency changes, rebuild:
docker-compose up -d --build
```

---

## 📖 More Information

For detailed documentation:
- **[Complete Docker Guide](./DOCKER.md)** - Full documentation
- **[README.md](./README.md)** - Project overview
- **[SETUP.md](./SETUP.md)** - Manual setup guide

---

## 🎓 What's Running?

| Service    | Port | Description          |
|------------|------|----------------------|
| Frontend   | 3000 | Next.js web app      |
| Backend    | 3001 | NestJS API           |
| PostgreSQL | 5432 | Database             |
| Redis      | 6379 | Cache/Queue          |

All services run with hot reload in development mode!

