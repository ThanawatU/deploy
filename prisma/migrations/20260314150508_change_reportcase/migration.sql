/*
  Warnings:

  - You are about to drop the column `driverId` on the `ReportCase` table. All the data in the column will be lost.
  - Added the required column `reportedUserId` to the `ReportCase` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ReportCase" DROP CONSTRAINT "ReportCase_driverId_fkey";

-- DropIndex
DROP INDEX "ReportCase_driverId_idx";

-- AlterTable
ALTER TABLE "ReportCase" DROP COLUMN "driverId",
ADD COLUMN     "reportedUserId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ReportCase_reportedUserId_idx" ON "ReportCase"("reportedUserId");

-- AddForeignKey
ALTER TABLE "ReportCase" ADD CONSTRAINT "ReportCase_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
