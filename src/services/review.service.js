const { BookingStatus } = require("@prisma/client");
const { prisma } = require("../utils/prisma");

/**
 * สร้าง review
 * Rules:
 *  1. reviewer ต้องมี role PASSENGER
 *  2. booking ต้องเป็นของ reviewer และ status = CONFIRMED
 *  3. review ซ้ำไม่ได้ (bookingId @unique)
 *  4. rating ต้องอยู่ใน 1–5
 */
const createReview = async ({ reviewerId, bookingId, rating, comment }) => {
  // validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error("rating ต้องเป็นตัวเลข 1–5"), { statusCode: 400 });
  }

  // ดึง booking พร้อม route เพื่อหา driverId
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { route: { select: { driverId: true } } },
  });

  if (!booking) {
    throw Object.assign(new Error("ไม่พบ booking"), { statusCode: 404 });
  }

  // ต้องเป็น booking ของ reviewer เท่านั้น
  if (booking.passengerId !== reviewerId) {
    throw Object.assign(new Error("คุณไม่ใช่ผู้โดยสารของ booking นี้"), { statusCode: 403 });
  }
    const route = await prisma.route.findUnique({
    where: { id: booking.routeId }
  });
  
  // route ต้อง CONFIRMED เท่านั้น
  if (route.status !== "COMPLETED") {
    throw Object.assign(
      new Error("สามารถรีวิวได้เฉพาะ route ที่มีสถานะ COMPLETED เท่านั้น"),
      { statusCode: 400 }
    );
  }

  const driverId = booking.route.driverId;

  // ป้องกัน review ตัวเอง (กรณีมี edge case)
  if (driverId === reviewerId) {
    throw Object.assign(new Error("ไม่สามารถรีวิวตัวเองได้"), { statusCode: 400 });
  }

  // สร้าง review — ถ้า bookingId ซ้ำ Prisma จะ throw P2002
  try {
    const review = await prisma.driverReview.create({
      data: {
        reviewerId,
        driverId,
        bookingId,
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
        driver:   { select: { id: true, firstName: true, lastName: true } },
        booking:  { select: { id: true, status: true } },
      },
    });

    return review;
  } catch (err) {
    if (err.code === "P2002") {
      throw Object.assign(
        new Error("คุณได้รีวิว booking นี้ไปแล้ว"),
        { statusCode: 409 }
      );
    }
    throw err;
  }
};

// ─────────────────────────────────────────────
// Get Reviews ของ Driver
// ─────────────────────────────────────────────

/**
 * ดึง review ทั้งหมดของ driver พร้อม pagination
 * คืน reviews + avgRating + totalReviews
 */
const getDriverReviews = async (driverId, opts = {}) => {
  const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = opts;

  const skip = (page - 1) * limit;

  const [total, reviews] = await prisma.$transaction([
    prisma.driverReview.count({ where: { driverId } }),
    prisma.driverReview.findMany({
      where:   { driverId },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    }),
  ]);

  // คำนวณ avg rating
  const agg = await prisma.driverReview.aggregate({
    where:   { driverId },
    _avg:    { rating: true },
    _count:  { rating: true },
  });

  return {
    reviews,
    avgRating:    agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    totalReviews: total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────
// Get Review ของ Booking (ตรวจสอบว่ารีวิวแล้วหรือยัง)
// ─────────────────────────────────────────────

const getReviewByBooking = async (bookingId) => {
  return prisma.driverReview.findUnique({
    where: { bookingId },
    include: {
      reviewer: { select: { id: true, firstName: true, lastName: true } },
      driver:   { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

// ─────────────────────────────────────────────
// Get My Reviews (ที่ passenger เขียนไว้)
// ─────────────────────────────────────────────

const getMyReviews = async (reviewerId, opts = {}) => {
  const { page = 1, limit = 10 } = opts;
  const skip = (page - 1) * limit;

  const [total, reviews] = await prisma.$transaction([
    prisma.driverReview.count({ where: { reviewerId } }),
    prisma.driverReview.findMany({
      where:   { reviewerId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        driver:  { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
        booking: { select: { id: true, status: true, createdAt: true } },
      },
    }),
  ]);

  return {
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────
// Admin — Get All Reviews
// ─────────────────────────────────────────────

const getAllReviews = async (opts = {}) => {
  const { page = 1, limit = 20, driverId, rating, sortBy = "createdAt", sortOrder = "desc" } = opts;

  const where = {
    ...(driverId ? { driverId } : {}),
    ...(rating   ? { rating: Number(rating) } : {}),
  };

  const skip = (page - 1) * limit;

  const [total, reviews] = await prisma.$transaction([
    prisma.driverReview.count({ where }),
    prisma.driverReview.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        driver:   { select: { id: true, firstName: true, lastName: true, email: true } },
        booking:  { select: { id: true, status: true } },
      },
    }),
  ]);

  return {
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────
// Admin — Delete Review
// ─────────────────────────────────────────────

const deleteReview = async (id) => {
  const review = await prisma.driverReview.findUnique({ where: { id } });
  if (!review) throw Object.assign(new Error("ไม่พบ review"), { statusCode: 404 });

  await prisma.driverReview.delete({ where: { id } });
  return review;
};

module.exports = {
  createReview,
  getDriverReviews,
  getReviewByBooking,
  getMyReviews,
  getAllReviews,
  deleteReview,
};