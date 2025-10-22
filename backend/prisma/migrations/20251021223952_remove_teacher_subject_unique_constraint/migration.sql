-- DropIndex
DROP INDEX "public"."teacher_subjects_teacherId_subjectId_key";

-- CreateIndex
CREATE INDEX "teacher_subjects_teacherId_subjectId_idx" ON "teacher_subjects"("teacherId", "subjectId");
