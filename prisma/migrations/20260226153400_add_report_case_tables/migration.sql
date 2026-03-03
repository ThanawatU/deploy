CREATE TYPE "ReportCategory" AS ENUM ('DANGEROUS_DRIVING', 'AGGRESSIVE_BEHAVIOR', 'HARASSMENT', 'NO_SHOW', 'FRAUD_OR_SCAM', 'OTHER');

CREATE TYPE "ReportCaseStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED', 'REJECTED', 'CLOSED');

CREATE TYPE "ReportEvidenceType" AS ENUM ('VIDEO', 'IMAGE', 'AUDIO', 'DOCUMENT');

CREATE TABLE "ReportCase" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "bookingId" TEXT,
    "routeId" TEXT,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportCaseStatus" NOT NULL DEFAULT 'FILED',
    "resolvedById" TEXT,
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportCaseStatusHistory" (
    "id" TEXT NOT NULL,
    "reportCaseId" TEXT NOT NULL,
    "fromStatus" "ReportCaseStatus",
    "toStatus" "ReportCaseStatus" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCaseStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportEvidence" (
    "id" TEXT NOT NULL,
    "reportCaseId" TEXT NOT NULL,
    "type" "ReportEvidenceType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportCase_reporterId_idx" ON "ReportCase"("reporterId");

CREATE INDEX "ReportCase_driverId_idx" ON "ReportCase"("driverId");

CREATE INDEX "ReportCase_bookingId_idx" ON "ReportCase"("bookingId");

CREATE INDEX "ReportCase_routeId_idx" ON "ReportCase"("routeId");

CREATE INDEX "ReportCase_status_idx" ON "ReportCase"("status");

CREATE INDEX "ReportCase_createdAt_idx" ON "ReportCase"("createdAt");

CREATE INDEX "ReportCase_resolvedById_idx" ON "ReportCase"("resolvedById");

CREATE INDEX "ReportCaseStatusHistory_reportCaseId_createdAt_idx" ON "ReportCaseStatusHistory"("reportCaseId", "createdAt");

CREATE INDEX "ReportCaseStatusHistory_changedById_idx" ON "ReportCaseStatusHistory"("changedById");

CREATE INDEX "ReportEvidence_reportCaseId_idx" ON "ReportEvidence"("reportCaseId");

CREATE INDEX "ReportEvidence_type_idx" ON "ReportEvidence"("type");

CREATE INDEX "ReportEvidence_uploadedById_idx" ON "ReportEvidence"("uploadedById");

ALTER TABLE "ReportCase" ADD CONSTRAINT "ReportCase_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportCase" ADD CONSTRAINT "ReportCase_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportCase" ADD CONSTRAINT "ReportCase_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportCase" ADD CONSTRAINT "ReportCase_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportCase" ADD CONSTRAINT "ReportCase_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportCaseStatusHistory" ADD CONSTRAINT "ReportCaseStatusHistory_reportCaseId_fkey" FOREIGN KEY ("reportCaseId") REFERENCES "ReportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportCaseStatusHistory" ADD CONSTRAINT "ReportCaseStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportEvidence" ADD CONSTRAINT "ReportEvidence_reportCaseId_fkey" FOREIGN KEY ("reportCaseId") REFERENCES "ReportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportEvidence" ADD CONSTRAINT "ReportEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
