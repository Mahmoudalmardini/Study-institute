-- Add percent column for percentage-based student discounts
ALTER TABLE "student_discounts"
ADD COLUMN "percent" DECIMAL(5,2);

