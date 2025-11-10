# Study Institute - Educational Management System
## CV Project Description

**Full-Stack Educational Management System**

Developed a comprehensive full-stack web application for managing educational institutes with role-based access control, homework management, grade tracking, and payroll administration. The system supports multiple user roles (Admin, Supervisor, Teacher, Student) with distinct permissions and workflows.

### Key Features & Functionality:
- **Authentication & Authorization**: Implemented JWT-based authentication with refresh token rotation, role-based access control (RBAC), and secure password hashing using bcrypt
- **Homework Management**: Complete workflow for creating, submitting, and reviewing homework assignments with file uploads, status tracking (Pending, Submitted, Graded, Late), and multi-level review system (Teacher → Admin approval)
- **Grade Management**: Comprehensive grade tracking system with term-based organization, academic year management, and detailed student performance analytics
- **Student Evaluation System**: Behavior and performance scoring with teacher feedback and comments
- **Payroll Management**: Automated payroll calculation system supporting both monthly salary and hourly wage models, with hour request approval workflow
- **Points/Rewards System**: Transaction-based point system for student motivation and engagement tracking
- **Announcement System**: Priority-based announcements with role targeting and expiration dates
- **File Management**: Secure file upload system supporting multiple file types (documents, images, videos, audio) with polymorphic associations
- **Multi-language Support**: Internationalization (i18n) with English and Arabic language support using next-intl
- **Responsive Design**: Mobile-first UI design with modern, accessible components

### Technical Stack:

**Backend:**
- **Framework**: NestJS 11+ with TypeScript
- **Database**: PostgreSQL 16 with Prisma ORM
- **Caching**: Redis 7 for session management and performance optimization
- **Authentication**: Passport.js with JWT and Local strategies
- **Validation**: class-validator and class-transformer for DTO validation
- **Queue Management**: Bull queue with Redis for background job processing
- **Rate Limiting**: Throttler module for API protection
- **File Upload**: Multer for handling multipart/form-data

**Frontend:**
- **Framework**: Next.js 15+ with React 19 and TypeScript
- **Styling**: Tailwind CSS 4 with Radix UI components
- **State Management**: Zustand for client-side state, React Query (TanStack Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **HTTP Client**: Axios with interceptors for token refresh and request deduplication
- **Internationalization**: next-intl for multi-language support
- **UI Components**: Radix UI primitives with custom styling

**DevOps & Infrastructure:**
- **Containerization**: Docker and Docker Compose for containerized deployment
- **Database Migrations**: Prisma migrations with version control
- **Environment Management**: Configuration management with @nestjs/config
- **Scripts**: PowerShell automation scripts for development workflow

### Architecture & Design Patterns:
- **Modular Architecture**: Feature-based module organization in NestJS (auth, homework, grades, payroll, etc.)
- **RESTful API Design**: Well-structured REST endpoints with proper HTTP methods and status codes
- **Database Design**: Normalized relational database schema with proper indexing, foreign keys, and cascade operations
- **Security Best Practices**: JWT token rotation, password hashing, role-based guards, input validation, and SQL injection prevention through ORM
- **Error Handling**: Centralized exception filters and error interceptors
- **Request Optimization**: Implemented request deduplication and short-lived caching to prevent API hammering and reduce server load
- **Type Safety**: End-to-end TypeScript with strict type checking

### Database Models:
Designed and implemented 15+ database models including Users, Students, Teachers, Classes, Subjects, Homework, Submissions, Grades, Evaluations, Announcements, Files, Payroll Records, Hour Requests, and Point Transactions with complex relationships and junction tables.

### Development Practices:
- **Version Control**: Git-based workflow
- **Code Quality**: ESLint and Prettier for code formatting and linting
- **Testing**: Jest configuration for unit and e2e testing
- **API Documentation**: RESTful API with clear endpoint structure
- **Database Seeding**: Automated seed scripts for development data

### Deployment:
- Dockerized application with separate containers for frontend, backend, PostgreSQL, and Redis
- Production-ready configuration with environment variable management
- Nginx configuration for reverse proxy and static file serving

