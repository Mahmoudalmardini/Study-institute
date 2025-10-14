# Study Institute - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Git installed

---

## 📦 First Time Setup

### 1. Start Database Services
```bash
# Start PostgreSQL and Redis in Docker
docker-compose up -d
```

### 2. Start Backend
```bash
cd backend
npm install          # Only needed first time
npm run start:dev    # Starts on http://localhost:3001
```

### 3. Start Frontend
```bash
cd frontend
npm install          # Only needed first time
npm run dev          # Starts on http://localhost:3000
```

---

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **API Health Check**: http://localhost:3001/api/health

When you visit http://localhost:3000, you'll automatically be redirected to the login page.

---

## 👤 Default Admin Account

The system comes with a pre-configured admin account:

**Login Credentials:**
- **Username**: `admin`
- **Password**: `admin123`

### First Login
1. Visit http://localhost:3000
2. You'll be redirected to the login page
3. Enter the credentials above
4. You'll be redirected to the Admin Dashboard

> **Note**: The admin account is automatically created when you run the database migrations. If you need to recreate it, run: `cd backend && npx prisma db seed`

---

## 📋 Available User Roles

The system supports 4 user roles:
- **ADMIN** - Full system access
- **SUPERVISOR** - Administrative access
- **TEACHER** - Can manage classes, homework, and grades
- **STUDENT** - Can view homework, submit assignments, and see grades

> **Note**: The system uses usernames for authentication (no email required)

---

## 🛠️ Daily Development Workflow

### Starting Your Work
```bash
# 1. Ensure Docker services are running
docker ps  # Should show postgres and redis containers

# If not running:
docker-compose up -d

# 2. Start backend (Terminal 1)
cd backend
npm run start:dev

# 3. Start frontend (Terminal 2)
cd frontend
npm run dev
```

### Stopping Services
```bash
# Stop frontend/backend: Press Ctrl+C in their terminals

# Stop Docker services
docker-compose down
```

---

## 🔍 Useful Commands

### Check Service Status
```bash
# Check Docker containers
docker ps

# Check backend health
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:3000
```

### Database Management
```bash
cd backend

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View database in browser
npx prisma studio
```

### View Logs
```bash
# Docker service logs
docker logs study-institute-postgres
docker logs study-institute-redis

# Backend logs: Visible in the terminal where you ran npm run start:dev
# Frontend logs: Visible in the terminal where you ran npm run dev
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users (Admin only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Students
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `GET /api/students/me` - Get current student
- `PATCH /api/students/:id` - Update student

### Homework
- `GET /api/homework` - List homework
- `POST /api/homework` - Create homework
- `POST /api/homework/submissions` - Submit homework
- `GET /api/homework/submissions/me` - Get my submissions

### Grades
- `GET /api/grades` - List grades
- `POST /api/grades` - Create grade
- `GET /api/grades/me` - Get my grades

### Announcements
- `GET /api/announcements` - List announcements
- `POST /api/announcements` - Create announcement

### Evaluations
- `GET /api/evaluations` - List evaluations
- `POST /api/evaluations` - Create evaluation
- `GET /api/evaluations/me` - Get my evaluations

---

## ⚠️ Troubleshooting

### Port Already in Use
```bash
# If port 5432 is in use (local PostgreSQL):
# Docker is configured to use port 5433 instead

# If port 3000 or 3001 is in use:
# Kill the process using that port or change the port in .env files
```

### Database Connection Error
```bash
# Ensure Docker containers are running
docker ps

# Restart PostgreSQL
docker restart study-institute-postgres

# Check backend .env file has correct DATABASE_URL:
# DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/study_institute?schema=public"
```

### Frontend Build Errors
```bash
cd frontend

# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

---

## 🎯 Next Steps

1. Create additional users (teachers, students)
2. Set up classes and subjects
3. Create homework assignments
4. Test the student submission workflow
5. Grade submissions and view reports

For detailed API documentation, visit: http://localhost:3001/api

---

## 📚 Technology Stack

- **Frontend**: Next.js 15, React, TailwindCSS
- **Backend**: NestJS, Prisma, PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT
- **Containerization**: Docker

---

**Need help?** Check the logs in your terminal windows or open an issue in the repository.

