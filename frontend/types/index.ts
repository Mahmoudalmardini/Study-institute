export enum Role {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  LATE = 'LATE',
}

export enum AnnouncementPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface StudentClass {
  id: string;
  studentId: string;
  classId: string;
  class: Class;
  assignedBy: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSubject {
  id: string;
  studentId: string;
  subjectId: string;
  subject: Subject;
  enrolledBy: string;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  userId: string;
  user: User;
  parentEmail?: string;
  parentPhone?: string;
  enrollmentDate: string;
  classId?: string;
  class?: Class;
  classes?: StudentClass[];
  subjects?: StudentSubject[];
}

export interface Teacher {
  id: string;
  userId: string;
  user: User;
  subject?: string;
  specialization?: string;
  hireDate: string;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  academicYear: string;
  teacherId?: string;
  teacher?: Teacher;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  monthlyInstallment?: number;
  classId?: string;
  class?: Class;
  createdAt: string;
  updatedAt: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  class: Class;
  teacherId: string;
  teacher: Teacher;
  fileUrls: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    submissions: number;
  };
}

export interface Submission {
  id: string;
  homeworkId: string;
  homework?: Homework;
  studentId: string;
  student?: Student;
  submittedAt?: string;
  fileUrls: string[];
  status: SubmissionStatus;
  grade?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  student?: Student;
  subjectId: string;
  subject?: Subject;
  grade: number;
  term: string;
  academicYear: string;
  teacherId: string;
  teacher?: Teacher;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: User;
  targetRoles: Role[];
  priority: AnnouncementPriority;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
  };
}

export interface Evaluation {
  id: string;
  studentId: string;
  student?: Student;
  teacherId: string;
  teacher?: Teacher;
  term: string;
  academicYear: string;
  behaviorScore: number;
  performanceScore: number;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

// Form DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
}

export interface CreateHomeworkDto {
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  fileUrls?: string[];
}

export interface CreateSubmissionDto {
  homeworkId: string;
  fileUrls?: string[];
}

export interface GradeSubmissionDto {
  grade: number;
  feedback?: string;
}

export interface CreateGradeDto {
  studentId: string;
  subjectId: string;
  grade: number;
  term: string;
  academicYear: string;
  notes?: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  targetRoles: Role[];
  priority?: AnnouncementPriority;
  expiresAt?: string;
}

export interface CreateEvaluationDto {
  studentId: string;
  term: string;
  academicYear: string;
  behaviorScore: number;
  performanceScore: number;
  comments?: string;
}

export interface TeacherStudentSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  classNames: string[];
}

// Payroll types
export enum HourRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MODIFIED = 'MODIFIED',
}

export interface TeacherSalary {
  id: string;
  teacherId: string;
  teacher?: Teacher;
  monthlySalary?: number | string;
  hourlyWage?: number | string;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface HourRequest {
  id: string;
  teacherId: string;
  teacher?: Teacher;
  date: string;
  hours: number | string;
  minutes: number;
  status: HourRequestStatus;
  adminModifiedHours?: number | string;
  adminModifiedMinutes?: number;
  adminFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyPayrollRecord {
  id: string;
  teacherId: string;
  teacher?: Teacher;
  month: number;
  year: number;
  monthlySalary: number | string;
  totalHours: number | string;
  hourlyWage: number | string;
  totalEntitlement: number | string;
  createdAt: string;
  updatedAt: string;
}

// Installment types
export enum InstallmentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface StudentDiscount {
  id: string;
  studentId: string;
  student?: Student;
  amount: number | string;
  percent?: number | string | null;
  reason?: string;
  isActive: boolean;
  createdBy: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInstallment {
  id: string;
  studentId: string;
  student?: Student;
  month: number;
  year: number;
  totalAmount: number | string;
  paidAmount: number | string;
  outstandingAmount: number | string;
  discountAmount: number | string;
  status: InstallmentStatus;
  createdAt: string;
  updatedAt: string;
  payments?: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  student?: Student;
  installmentId: string;
  installment?: {
    month: number;
    year: number;
  };
  amount: number | string;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CreateDiscountDto {
  studentId: string;
  amount?: number;
  percent?: number;
  reason?: string;
}

export interface CreatePaymentDto {
  studentId: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

