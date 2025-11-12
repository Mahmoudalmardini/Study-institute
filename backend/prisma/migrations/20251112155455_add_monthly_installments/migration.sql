-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "monthlyInstallment" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "student_discounts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_installments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_discounts_studentId_idx" ON "student_discounts"("studentId");

-- CreateIndex
CREATE INDEX "student_discounts_isActive_idx" ON "student_discounts"("isActive");

-- CreateIndex
CREATE INDEX "student_discounts_createdBy_idx" ON "student_discounts"("createdBy");

-- CreateIndex
CREATE INDEX "student_installments_studentId_idx" ON "student_installments"("studentId");

-- CreateIndex
CREATE INDEX "student_installments_year_month_idx" ON "student_installments"("year", "month");

-- CreateIndex
CREATE INDEX "student_installments_status_idx" ON "student_installments"("status");

-- CreateIndex
CREATE INDEX "student_installments_studentId_year_month_idx" ON "student_installments"("studentId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "student_installments_studentId_month_year_key" ON "student_installments"("studentId", "month", "year");

-- CreateIndex
CREATE INDEX "payment_records_studentId_idx" ON "payment_records"("studentId");

-- CreateIndex
CREATE INDEX "payment_records_installmentId_idx" ON "payment_records"("installmentId");

-- CreateIndex
CREATE INDEX "payment_records_paymentDate_idx" ON "payment_records"("paymentDate");

-- CreateIndex
CREATE INDEX "payment_records_recordedBy_idx" ON "payment_records"("recordedBy");

-- AddForeignKey
ALTER TABLE "student_discounts" ADD CONSTRAINT "student_discounts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_installments" ADD CONSTRAINT "student_installments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "student_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
