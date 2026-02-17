-- CreateEnum
CREATE TYPE "BlacklistType" AS ENUM ('DRIVER', 'PASSENGER');

-- CreateEnum
CREATE TYPE "BlacklistStatus" AS ENUM ('ACTIVE', 'LIFTED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BlacklistType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BlacklistStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedUntil" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "liftedById" TEXT,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistEvidence" (
    "id" TEXT NOT NULL,
    "blacklistId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blacklist_userId_idx" ON "Blacklist"("userId");

-- CreateIndex
CREATE INDEX "Blacklist_status_idx" ON "Blacklist"("status");

-- CreateIndex
CREATE INDEX "Blacklist_type_idx" ON "Blacklist"("type");

-- CreateIndex
CREATE INDEX "Blacklist_createdAt_idx" ON "Blacklist"("createdAt");

-- CreateIndex
CREATE INDEX "BlacklistEvidence_blacklistId_idx" ON "BlacklistEvidence"("blacklistId");

-- CreateIndex
CREATE INDEX "BlacklistEvidence_type_idx" ON "BlacklistEvidence"("type");

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlacklistEvidence" ADD CONSTRAINT "BlacklistEvidence_blacklistId_fkey" FOREIGN KEY ("blacklistId") REFERENCES "Blacklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlacklistEvidence" ADD CONSTRAINT "BlacklistEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
