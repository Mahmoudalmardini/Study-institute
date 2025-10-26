-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
