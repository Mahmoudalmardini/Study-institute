-- Add percent column for percentage-based student discounts.
-- Misdated: it sorts before the migration that creates student_discounts, so on an empty
-- database it is a no-op and 20261004000000_reconcile_installment_columns adds the column.
DO $$
BEGIN
    IF to_regclass('student_discounts') IS NOT NULL THEN
        ALTER TABLE "student_discounts" ADD COLUMN IF NOT EXISTS "percent" DECIMAL(5,2);
    END IF;
END $$;
