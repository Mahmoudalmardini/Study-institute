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

- Node.js 18 or higher
- Docker & Docker Compose
- npm or yarn package manager



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
