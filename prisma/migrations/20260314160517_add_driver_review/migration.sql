-- CreateTable
CREATE TABLE "DriverReview" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverReview_bookingId_key" ON "DriverReview"("bookingId");

-- CreateIndex
CREATE INDEX "DriverReview_driverId_idx" ON "DriverReview"("driverId");

-- CreateIndex
CREATE INDEX "DriverReview_reviewerId_idx" ON "DriverReview"("reviewerId");

-- CreateIndex
CREATE INDEX "DriverReview_bookingId_idx" ON "DriverReview"("bookingId");

-- CreateIndex
CREATE INDEX "DriverReview_rating_idx" ON "DriverReview"("rating");

-- CreateIndex
CREATE INDEX "DriverReview_createdAt_idx" ON "DriverReview"("createdAt");

-- AddForeignKey
ALTER TABLE "DriverReview" ADD CONSTRAINT "DriverReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverReview" ADD CONSTRAINT "DriverReview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverReview" ADD CONSTRAINT "DriverReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
