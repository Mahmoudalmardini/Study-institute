-- DropIndex
DROP INDEX "public"."subjects_code_key";

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "code" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "subjects_code_idx" ON "subjects"("code");
