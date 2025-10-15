-- CreateTable
CREATE TABLE "student_teachers" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_teachers_studentId_idx" ON "student_teachers"("studentId");

-- CreateIndex
CREATE INDEX "student_teachers_teacherId_idx" ON "student_teachers"("teacherId");

-- CreateIndex
CREATE INDEX "student_teachers_assignedBy_idx" ON "student_teachers"("assignedBy");

-- CreateIndex
CREATE UNIQUE INDEX "student_teachers_studentId_teacherId_key" ON "student_teachers"("studentId", "teacherId");

-- AddForeignKey
ALTER TABLE "student_teachers" ADD CONSTRAINT "student_teachers_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teachers" ADD CONSTRAINT "student_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
