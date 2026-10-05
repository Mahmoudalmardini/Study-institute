-- Composite indexes matching current query patterns (filter + sort columns).
-- Additive only: no drops, no column changes. IF NOT EXISTS keeps re-runs safe.
-- CreateIndex
CREATE INDEX IF NOT EXISTS "homework_teacherId_dueDate_idx" ON "homework"("teacherId", "dueDate");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "homework_classId_dueDate_idx" ON "homework"("classId", "dueDate");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_teacherId_submittedAt_idx" ON "submissions"("teacherId", "submittedAt");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_reviewStatus_teacherReviewedAt_idx" ON "submissions"("reviewStatus", "teacherReviewedAt");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_studentId_reviewStatus_idx" ON "submissions"("studentId", "reviewStatus");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_subjectId_submittedAt_idx" ON "submissions"("subjectId", "submittedAt");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_salaries_teacherId_effectiveFrom_idx" ON "teacher_salaries"("teacherId", "effectiveFrom");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "hour_requests_status_createdAt_idx" ON "hour_requests"("status", "createdAt");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "hour_requests_teacherId_status_date_idx" ON "hour_requests"("teacherId", "status", "date");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_discounts_studentId_isActive_idx" ON "student_discounts"("studentId", "isActive");
