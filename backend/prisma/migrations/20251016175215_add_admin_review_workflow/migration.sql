-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_TEACHER_REVIEW', 'PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN');

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "adminEvaluation" "EvaluationStatus",
ADD COLUMN     "adminFeedback" TEXT,
ADD COLUMN     "adminReviewedAt" TIMESTAMP(3),
ADD COLUMN     "adminReviewedBy" TEXT,
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_TEACHER_REVIEW',
ADD COLUMN     "teacherEvaluation" "EvaluationStatus",
ADD COLUMN     "teacherFeedback" TEXT,
ADD COLUMN     "teacherReviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "submissions_reviewStatus_idx" ON "submissions"("reviewStatus");
