-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "submissions_teacherId_idx" ON "submissions"("teacherId");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
