-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'JSON', 'PDF');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "integrityHash" VARCHAR(64);

-- CreateTable
CREATE TABLE "ExportRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "logType" VARCHAR(20) NOT NULL,
    "format" "ExportFormat" NOT NULL DEFAULT 'CSV',
    "filters" JSON,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportRequest_requestedById_idx" ON "ExportRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ExportRequest_status_idx" ON "ExportRequest"("status");

-- CreateIndex
CREATE INDEX "ExportRequest_createdAt_idx" ON "ExportRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ExportRequest_reviewedById_idx" ON "ExportRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_integrityHash_idx" ON "AuditLog"("integrityHash");

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
