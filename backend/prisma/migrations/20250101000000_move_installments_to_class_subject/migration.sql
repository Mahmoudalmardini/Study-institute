-- AlterTable: Add monthlyInstallment column to class_subjects table
ALTER TABLE "class_subjects" ADD COLUMN "monthlyInstallment" DECIMAL(10,2);

-- Data Migration: Copy existing monthlyInstallment values from subjects to class_subjects
-- For each subject with a monthlyInstallment, copy it to all related class_subjects records
UPDATE "class_subjects" cs
SET "monthlyInstallment" = s."monthlyInstallment"
FROM "subjects" s
WHERE cs."subjectId" = s."id"
  AND s."monthlyInstallment" IS NOT NULL
  AND cs."monthlyInstallment" IS NULL;

-- AlterTable: Remove monthlyInstallment column from subjects table
ALTER TABLE "subjects" DROP COLUMN "monthlyInstallment";

