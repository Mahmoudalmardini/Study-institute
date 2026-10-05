-- Re-applies, idempotently, the effects of two misdated migrations
-- (20241120120000_add_discount_percent, 20250101000000_move_installments_to_class_subject)
-- that are no-ops on a fresh database because they sort before the tables they change.
-- On a database where those migrations already ran, every statement below is a no-op.

ALTER TABLE "student_discounts" ADD COLUMN IF NOT EXISTS "percent" DECIMAL(5,2);

ALTER TABLE "class_subjects" ADD COLUMN IF NOT EXISTS "monthlyInstallment" DECIMAL(10,2);

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

        ALTER TABLE "subjects" DROP COLUMN "monthlyInstallment";
    END IF;
END $$;
