-- AlterTable
ALTER TABLE "student_subjects" ADD COLUMN     "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "student_subjects_teacherId_idx" ON "student_subjects"("teacherId");

-- AddForeignKey
ALTER TABLE "student_subjects" ADD CONSTRAINT "student_subjects_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
