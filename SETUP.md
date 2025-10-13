# Quick Setup Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ Docker Desktop installed and running
- ✅ npm or yarn installed

## Step-by-Step Setup

### 1. Start Database Services (REQUIRED)

```bash
# From project root
docker-compose up -d
```

**Verify services are running:**
```bash
docker ps
```

You should see:
- `study-institute-postgres` on port 5432
- `study-institute-redis` on port 6379

### 2. Backend Setup

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Create .env file
cp env.template .env

# Generate Prisma Client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Start backend
npm run start:dev
```

**Expected output:**
```
🚀 Application is running on: http://localhost:3001/api
```

**Test the API:**
```bash
curl http://localhost:3001/api
```

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Create .env.local file
cp env.local.template .env.local

# Start frontend
npm run dev
```

**Expected output:**
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
```

## Testing the Setup

### 1. Test Backend Health

```bash
# Check if backend is running
curl http://localhost:3001/api

# Should return the default NestJS response
```

### 2. Test Database Connection

```bash
cd backend
npx prisma studio
```

This opens Prisma Studio at `http://localhost:5555` where you can view your database.

### 3. Test Frontend

Open browser: `http://localhost:3000`

## Common Issues & Solutions

### Issue: Docker containers won't start

**Solution:**
1. Ensure Docker Desktop is running
2. Check port conflicts:
   ```bash
   # Check if ports are in use
   netstat -ano | findstr :5432
   netstat -ano | findstr :6379
   ```
3. Stop conflicting services or change ports in `docker-compose.yml`

### Issue: "Cannot connect to database"

**Solution:**
1. Verify PostgreSQL is running: `docker ps`
2. Check DATABASE_URL in `backend/.env`:
   ```
   DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/study_institute?schema=public"
   ```
3. Restart Docker containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Issue: Prisma migration fails

**Solution:**
```bash
cd backend

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name init
```

### Issue: Module not found errors

**Solution:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port already in use

**Solutions:**

**For Backend (Port 3001):**
```bash
# Windows
netstat -ano | findstr :3001
# Kill the process using the PID shown

# Or change port in backend/.env
PORT=3002
```

**For Frontend (Port 3000):**
```bash
# Start on different port
npm run dev -- -p 3002
```

## Creating Your First User

### Option 1: Using API

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@studyinstitute.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }'
```

### Option 2: Using Prisma Studio

1. Open Prisma Studio: `npx prisma studio`
2. Navigate to `User` model
3. Click "Add record"
4. Fill in the details
5. Note: Password must be bcrypt hashed

## Database Seeding (Optional)

Create a seed file to populate test data:

```bash
cd backend

# Create seed file
# backend/prisma/seed.ts
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@studyinstitute.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Add more seed data as needed
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```bash
# Run seed
npx prisma db seed
```

## Development Workflow

### Typical Development Session

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database (optional)
npx prisma studio

# Terminal 4: Docker logs (optional)
docker-compose logs -f
```

## Stopping Services

```bash
# Stop Next.js (Ctrl+C in terminal)

# Stop NestJS (Ctrl+C in terminal)

# Stop Docker services
docker-compose down

# Stop Docker and remove volumes (WARNING: Deletes data)
docker-compose down -v
```

## Next Steps

After setup is complete:

1. ✅ Test API endpoints using Postman or curl
2. ✅ Create test users for each role
3. ✅ Build authentication pages (login/register)
4. ✅ Implement role-specific dashboards
5. ✅ Add file upload functionality
6. ✅ Build homework and grade management UI

## Getting Help

- Check backend logs in terminal
- Check frontend logs in browser console
- Review [README.md](./README.md) for architecture details
- Check [backend/README.md](./backend/README.md) for API docs

## Useful Commands

```bash
# Backend
npm run start:dev        # Development mode
npm run build           # Build for production
npm run start:prod      # Run production build
npx prisma studio       # Open database GUI
npx prisma migrate dev  # Create new migration

# Frontend
npm run dev            # Development mode
npm run build          # Build for production
npm start              # Run production build
npm run lint           # Lint code

# Docker
docker-compose up -d           # Start services
docker-compose down            # Stop services
docker-compose logs -f         # View logs
docker-compose ps              # Check status
docker-compose restart         # Restart all services
```

## Success Checklist

- [ ] Docker containers running (postgres + redis)
- [ ] Backend running on http://localhost:3001/api
- [ ] Frontend running on http://localhost:3000
- [ ] Can access Prisma Studio
- [ ] Can register/login a user via API
- [ ] No errors in terminal logs

## Ready to Develop! 🚀

You're all set! Start building features according to the plan.

