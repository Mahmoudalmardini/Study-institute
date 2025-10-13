# Study Institute Backend

A robust NestJS backend API for an educational institute management system with role-based authentication and comprehensive features for managing students, teachers, homework, grades, announcements, and evaluations.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with refresh tokens
- 👥 **Role-Based Access Control**: Admin, Supervisor, Teacher, and Student roles
- 📚 **Homework Management**: Create, submit, and grade assignments
- 📊 **Grade Tracking**: Comprehensive grade management system
- 📢 **Announcements**: Role-targeted announcement system
- 📝 **Evaluations**: Student performance evaluations
- 🔒 **Security**: Rate limiting, input validation, CORS, and more
- 🚀 **Performance**: Redis caching, database indexing

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **API**: RESTful with global prefix `/api`

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (for PostgreSQL and Redis)
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```bash
cp env.template .env
```

Update the `.env` file with your configuration:

```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/study_institute?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRATION=7d
PORT=3001
NODE_ENV=development
```

### 3. Start Database Services

Make sure Docker Desktop is running, then start PostgreSQL and Redis:

```bash
# From the root directory
docker-compose up -d
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 5. Seed Database (Optional)

Create a seed file to populate initial data:

```bash
npx prisma db seed
```

### 6. Start the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001/api`

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT",
  "phone": "+1234567890"
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

Response:
```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "STUDENT"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### User Endpoints

All user endpoints require authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer {accessToken}
```

#### Get Profile
```http
GET /api/users/profile
```

#### Get All Users (Admin/Supervisor only)
```http
GET /api/users?role=STUDENT
```

#### Create User (Admin only)
```http
POST /api/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "TEACHER"
}
```

### Homework Endpoints

#### Create Homework (Teacher only)
```http
POST /api/homework
Content-Type: application/json

{
  "title": "Math Assignment 1",
  "description": "Complete exercises 1-10",
  "dueDate": "2025-11-01T23:59:59Z",
  "classId": "class-uuid",
  "fileUrls": []
}
```

#### Get All Homework
```http
GET /api/homework?classId=class-uuid
```

#### Submit Homework (Student only)
```http
POST /api/homework/submissions
Content-Type: application/json

{
  "homeworkId": "homework-uuid",
  "fileUrls": ["url1", "url2"]
}
```

#### Grade Submission (Teacher only)
```http
PATCH /api/homework/submissions/{submissionId}/grade
Content-Type: application/json

{
  "grade": 95,
  "feedback": "Great work!"
}
```

### Grade Endpoints

#### Create Grade (Teacher only)
```http
POST /api/grades
Content-Type: application/json

{
  "studentId": "student-uuid",
  "subjectId": "subject-uuid",
  "grade": 85,
  "term": "Fall 2025",
  "academicYear": "2025-2026",
  "notes": "Good progress"
}
```

#### Get My Grades (Student only)
```http
GET /api/grades/me
```

#### Get All Grades (Admin/Supervisor/Teacher)
```http
GET /api/grades?studentId=student-uuid&academicYear=2025-2026
```

### Announcement Endpoints

#### Create Announcement (Admin/Supervisor/Teacher)
```http
POST /api/announcements
Content-Type: application/json

{
  "title": "Important Notice",
  "content": "School will be closed tomorrow",
  "targetRoles": ["STUDENT", "TEACHER"],
  "priority": "HIGH",
  "expiresAt": "2025-11-01T00:00:00Z"
}
```

#### Get All Announcements
```http
GET /api/announcements
```

### Evaluation Endpoints

#### Create Evaluation (Teacher only)
```http
POST /api/evaluations
Content-Type: application/json

{
  "studentId": "student-uuid",
  "term": "Fall 2025",
  "academicYear": "2025-2026",
  "behaviorScore": 90,
  "performanceScore": 85,
  "comments": "Excellent student"
}
```

#### Get My Evaluations (Student only)
```http
GET /api/evaluations/me
```

## Database Schema

### User Roles
- `ADMIN`: Full system access
- `SUPERVISOR`: View and manage students, teachers, and academic data
- `TEACHER`: Manage homework, grades, and evaluations
- `STUDENT`: View homework, grades, evaluations, and announcements

### Key Models
- **User**: Base user information with role
- **Student**: Extended student profile with parent info
- **Teacher**: Extended teacher profile
- **Class**: Class/group management
- **Homework**: Assignment management
- **Submission**: Student homework submissions
- **Grade**: Student grades
- **Announcement**: System announcements
- **Evaluation**: Student performance evaluations

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── decorators/     # Custom decorators (CurrentUser, Roles, Public)
│   │   ├── filters/        # Exception filters
│   │   ├── guards/         # Auth guards (JWT, Roles)
│   │   └── interceptors/   # Response transformers
│   ├── config/
│   │   └── configuration.ts
│   ├── modules/
│   │   ├── auth/           # Authentication
│   │   ├── users/          # User management
│   │   ├── students/       # Student management
│   │   ├── teachers/       # Teacher management
│   │   ├── homework/       # Homework & submissions
│   │   ├── grades/         # Grade management
│   │   ├── announcements/  # Announcements
│   │   ├── evaluations/    # Student evaluations
│   │   └── prisma/         # Prisma service
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
└── test/
```

## Scripts

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm run test
npm run test:e2e
npm run test:cov

# Linting
npm run lint

# Database
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev     # Create migration
npx prisma generate        # Generate Prisma Client
```

## Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (throttling)
- ✅ Input validation
- ✅ CORS configuration
- ✅ Password hashing (bcrypt)
- ✅ Global exception handling

## Performance Optimizations

- ✅ Redis caching layer
- ✅ Database indexes on frequently queried fields
- ✅ Pagination support
- ✅ Query optimization with Prisma

## License

MIT
