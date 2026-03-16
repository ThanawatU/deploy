-- AlterEnum
BEGIN;

-- Step 1: Map old values to new ones BEFORE changing the type
UPDATE "ReportCase"
SET "status" = CASE "status"::text
  WHEN 'FILED'        THEN 'PENDING'
  WHEN 'INVESTIGATING' THEN 'UNDER_REVIEW'
  WHEN 'CLOSED'       THEN 'RESOLVED'
  ELSE "status"::text
END
WHERE "status"::text IN ('FILED', 'INVESTIGATING', 'CLOSED');

UPDATE "ReportCaseStatusHistory"
SET "fromStatus" = CASE "fromStatus"::text
  WHEN 'FILED'        THEN 'PENDING'
  WHEN 'INVESTIGATING' THEN 'UNDER_REVIEW'
  WHEN 'CLOSED'       THEN 'RESOLVED'
  ELSE "fromStatus"::text
END
WHERE "fromStatus"::text IN ('FILED', 'INVESTIGATING', 'CLOSED');

UPDATE "ReportCaseStatusHistory"
SET "toStatus" = CASE "toStatus"::text
  WHEN 'FILED'        THEN 'PENDING'
  WHEN 'INVESTIGATING' THEN 'UNDER_REVIEW'
  WHEN 'CLOSED'       THEN 'RESOLVED'
  ELSE "toStatus"::text
END
WHERE "toStatus"::text IN ('FILED', 'INVESTIGATING', 'CLOSED');

-- Step 2: Now safe to swap the enum type
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
ALTER TABLE "ReportCase" ADD COLUMN "lastEvidenceAddedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';