-- AlterTable: Add monthlyInstallment column to class_subjects table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_subjects' AND column_name = 'monthlyInstallment'
    ) THEN
        ALTER TABLE "class_subjects" ADD COLUMN "monthlyInstallment" DECIMAL(10,2);
    END IF;
END $$;

-- Data Migration: Copy existing monthlyInstallment values from subjects to class_subjects
-- For each subject with a monthlyInstallment, copy it to all related class_subjects records
-- Only if the column exists in subjects table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'monthlyInstallment'
    ) THEN
        UPDATE "class_subjects" cs
        SET "monthlyInstallment" = s."monthlyInstallment"
        FROM "subjects" s
        WHERE cs."subjectId" = s."id"
          AND s."monthlyInstallment" IS NOT NULL
          AND cs."monthlyInstallment" IS NULL;
    END IF;
END $$;

-- AlterTable: Remove monthlyInstallment column from subjects table (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'monthlyInstallment'
    ) THEN
        ALTER TABLE "subjects" DROP COLUMN "monthlyInstallment";
    END IF;
END $$;

