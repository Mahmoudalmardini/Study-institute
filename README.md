# Study Institute - Educational Management System

A full-stack web application for managing an educational institute with role-based access control, homework management, grade tracking, announcements, and student evaluations.

## 🚀 Features

### Core Functionality
- **Authentication & Authorization**: JWT-based authentication with refresh tokens
- **Role-Based Access Control**: Four distinct roles (Admin, Supervisor, Teacher, Student/Parent)
- **Homework Management**: Create, assign, submit, and grade assignments
- **Grade Tracking**: Comprehensive grade management and viewing
- **Announcements**: Role-targeted announcement system with priority levels
- **Student Evaluations**: Performance and behavior tracking
- **File Sharing**: Secure file upload and management
- **Mobile-First Design**: Responsive across all devices

### Tech Stack

#### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **Architecture**: Clean Architecture with MVC pattern

#### Frontend
- **Framework**: Next.js 14+ with App Router
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 16
- **Cache**: Redis 7

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended)
  - OR Node.js 18+ and npm (for manual setup)

### Quick Start with Docker (Recommended)

The easiest way to run the entire application is with Docker:

```bash
# Clone the repository
git clone <repository-url>
cd study-institute

# Start all services (database, backend, frontend)
docker-compose up -d
```

**That's it!** The application is now running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

For detailed Docker instructions, production deployment, and advanced configuration, see **[DOCKER.md](./DOCKER.md)**.

**Quick Docker Commands:**
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

Or use the Makefile for convenience:
```bash
make dev-up      # Start development environment
make dev-down    # Stop development environment
make dev-logs    # View logs
make help        # See all available commands
```

### Manual Setup (Without Docker)

If you prefer to run services manually:

#### 1. Start Database Services

Ensure Docker Desktop is running, then start PostgreSQL and Redis:

```bash
docker-compose up -d postgres redis
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.template .env

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start the backend server
npm run start:dev
```

The backend API will be available at `http://localhost:3001`

#### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp env.local.template .env.local

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
study-institute/
├── backend/                  # NestJS backend
│   ├── src/
│   │   ├── common/          # Shared utilities (guards, decorators, filters)
│   │   ├── config/          # Configuration
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   ├── users/       # User management
│   │   │   ├── students/    # Student management
│   │   │   ├── teachers/    # Teacher management (to be implemented)
│   │   │   ├── homework/    # Homework & submissions
│   │   │   ├── grades/      # Grade management
│   │   │   ├── announcements/ # Announcements
│   │   │   ├── evaluations/ # Student evaluations
│   │   │   └── prisma/      # Prisma service
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma    # Database schema
├── frontend/                 # Next.js frontend
│   ├── app/                 # App Router pages
│   │   ├── (auth)/          # Authentication pages
│   │   ├── admin/           # Admin dashboard
│   │   ├── supervisor/      # Supervisor dashboard
│   │   ├── teacher/         # Teacher dashboard
│   │   └── student/         # Student dashboard
│   ├── components/          # React components
│   │   ├── ui/              # UI components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Utilities
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript types
│   └── store/               # Zustand stores
└── docker-compose.yml       # Docker services configuration
```

## 👥 User Roles & Permissions

### Admin
- Full system access
- Manage all users (CRUD)
- View all grades, homework, and evaluations
- System-wide announcements
- Generate reports

### Supervisor
- View student performance across classes
- Approve/review evaluations
- Communication with teachers/parents
- Access to reports and analytics

### Teacher
- Create and manage homework assignments
- Grade student submissions
- Post class announcements
- Create student evaluations
- Manage grades
- View student roster

### Student/Parent
- View assigned homework
- Submit homework with file uploads
- View grades and evaluations
- Read announcements
- Download shared files
- Basic messaging with teachers

## 🔐 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Protected Endpoints

All protected endpoints require the JWT token in the Authorization header:

```http
Authorization: Bearer {accessToken}
```

See [Backend README](./backend/README.md) for complete API documentation.

## 🗄️ Database Schema

### Key Models

- **Users**: Base user information with role-based access
- **Students**: Extended student profiles with parent information
- **Teachers**: Teacher profiles with specializations
- **Classes**: Class/group management
- **Subjects**: Subject definitions
- **Homework**: Assignment management
- **Submissions**: Student homework submissions with grading
- **Grades**: Student grade records
- **Announcements**: System-wide and role-targeted announcements
- **Evaluations**: Student performance evaluations
- **Files**: File management with secure access

## 🚀 Development

### With Docker (Recommended)

```bash
# Start development environment with hot reload
make dev-up

# View logs
make dev-logs

# Restart services
make dev-restart

# Access backend shell
make shell-backend

# Run database migrations
make migrate-dev

# Open Prisma Studio
make studio

# Stop services
make dev-down
```

See [DOCKER.md](./DOCKER.md) for comprehensive Docker documentation.

### Manual Development

#### Backend Development

```bash
cd backend

# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Open Prisma Studio (Database GUI)
npx prisma studio
```

#### Frontend Development

```bash
cd frontend

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/study_institute?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 📱 Mobile Responsiveness

The application is built with a mobile-first approach using:
- Responsive Tailwind CSS utilities
- Touch-optimized UI components
- Adaptive layouts for different screen sizes
- PWA support (can be enhanced)

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS configuration
- Rate limiting
- SQL injection prevention (Prisma ORM)
- XSS protection

## ⚡ Performance Optimizations

- Redis caching for frequently accessed data
- Database indexes on key fields
- Optimized Prisma queries with proper relations
- Next.js automatic code splitting
- Image optimization
- API response caching with React Query

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests (to be implemented)
cd frontend
npm run test
```

## 📝 Next Steps

### Immediate Enhancements Needed:
1. **Teacher Module**: Complete CRUD operations for teacher profiles
2. **Class Management**: Add class creation and management
3. **Subject Management**: Create subject CRUD operations
4. **File Upload**: Implement actual file upload service (AWS S3 or local storage)
5. **Authentication Pages**: Build login and register UI
6. **Dashboards**: Create role-specific dashboard pages
7. **Middleware**: Add Next.js middleware for route protection

### Future Enhancements:
- Real-time notifications with WebSockets
- Email notification system
- PDF report generation
- Calendar integration
- Mobile apps (React Native)
- Advanced analytics and reporting
- Video conferencing integration
- Quiz/assessment system
- Attendance tracking
- Parent-teacher messaging system

## 📄 License

MIT License

## 👨‍💻 Development Team

Built with clean architecture principles and best practices for scalability and maintainability.

---

## 📚 Additional Documentation

- **[Docker Deployment Guide](./DOCKER.md)** - Complete guide for Docker deployment (development & production)
- **[Setup Guide](./SETUP.md)** - Detailed manual setup instructions
- **[Project Status](./PROJECT_STATUS.md)** - Current implementation status and roadmap
- **[Backend Documentation](./backend/README.md)** - Backend API details

## 🐳 Deployment

### Production with Docker

For production deployment with Docker:

```bash
# Copy and configure production environment
cp .env.production.example .env.production
# Edit .env.production with your secure values

# Deploy production stack
make prod-up

# View production logs
make prod-logs
```

For detailed production deployment instructions including SSL configuration, monitoring, and best practices, see **[DOCKER.md](./DOCKER.md)**.

### Traditional Deployment

For deployment to traditional hosting environments, cloud platforms (AWS, GCP, Azure), or VPS:

1. Build both applications
2. Set up PostgreSQL and Redis
3. Configure environment variables
4. Run migrations
5. Start services with a process manager (PM2, systemd)

Detailed instructions available in [SETUP.md](./SETUP.md)
