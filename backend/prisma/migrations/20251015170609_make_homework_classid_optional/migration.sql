-- DropForeignKey
ALTER TABLE "public"."homework" DROP CONSTRAINT "homework_classId_fkey";

-- AlterTable
ALTER TABLE "homework" ALTER COLUMN "classId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
