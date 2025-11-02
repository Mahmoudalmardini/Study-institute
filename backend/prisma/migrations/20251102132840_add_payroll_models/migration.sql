-- CreateEnum
CREATE TYPE "HourRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED');

-- CreateTable
CREATE TABLE "teacher_salaries" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "monthlySalary" DECIMAL(65,30),
    "hourlyWage" DECIMAL(65,30),
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hour_requests" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(65,30) NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "HourRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminModifiedHours" DECIMAL(65,30),
    "adminModifiedMinutes" INTEGER,
    "adminFeedback" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hour_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_payroll_records" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlySalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hourlyWage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalEntitlement" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_salaries_teacherId_idx" ON "teacher_salaries"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_salaries_effectiveFrom_idx" ON "teacher_salaries"("effectiveFrom");

-- CreateIndex
CREATE INDEX "hour_requests_teacherId_idx" ON "hour_requests"("teacherId");

-- CreateIndex
CREATE INDEX "hour_requests_date_idx" ON "hour_requests"("date");

-- CreateIndex
CREATE INDEX "hour_requests_status_idx" ON "hour_requests"("status");

-- CreateIndex
CREATE INDEX "hour_requests_teacherId_date_idx" ON "hour_requests"("teacherId", "date");

-- CreateIndex
CREATE INDEX "monthly_payroll_records_teacherId_idx" ON "monthly_payroll_records"("teacherId");

-- CreateIndex
CREATE INDEX "monthly_payroll_records_year_month_idx" ON "monthly_payroll_records"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_payroll_records_teacherId_month_year_key" ON "monthly_payroll_records"("teacherId", "month", "year");

-- AddForeignKey
ALTER TABLE "teacher_salaries" ADD CONSTRAINT "teacher_salaries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hour_requests" ADD CONSTRAINT "hour_requests_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payroll_records" ADD CONSTRAINT "monthly_payroll_records_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
