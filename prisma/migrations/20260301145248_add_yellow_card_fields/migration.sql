-- AlterTable
ALTER TABLE "User" ADD COLUMN     "yellowCardCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "yellowCardExpiresAt" TIMESTAMP(3);
