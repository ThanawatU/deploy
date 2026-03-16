/*
  Warnings:

  - The values [FILED,INVESTIGATING,CLOSED] on the enum `ReportCaseStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReportCaseStatus_new" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');
ALTER TABLE "ReportCase" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReportCase" ALTER COLUMN "status" TYPE "ReportCaseStatus_new" USING ("status"::text::"ReportCaseStatus_new");
ALTER TABLE "ReportCaseStatusHistory" ALTER COLUMN "fromStatus" TYPE "ReportCaseStatus_new" USING ("fromStatus"::text::"ReportCaseStatus_new");
ALTER TABLE "ReportCaseStatusHistory" ALTER COLUMN "toStatus" TYPE "ReportCaseStatus_new" USING ("toStatus"::text::"ReportCaseStatus_new");
ALTER TYPE "ReportCaseStatus" RENAME TO "ReportCaseStatus_old";
ALTER TYPE "ReportCaseStatus_new" RENAME TO "ReportCaseStatus";
DROP TYPE "ReportCaseStatus_old";
ALTER TABLE "ReportCase" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "ReportCase" ADD COLUMN     "lastEvidenceAddedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';
