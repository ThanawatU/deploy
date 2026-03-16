const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/ApiError");
const reviewService = require("../services/review.service");

// ─────────────────────────────────────────────
// POST /api/reviews
// Passenger สร้าง review
// ─────────────────────────────────────────────

const createReview = asyncHandler(async (req, res) => {
  const reviewerId = req.user.id ?? req.user.sub;

  // เฉพาะ PASSENGER เท่านั้น
  if (req.user.role !== "PASSENGER") {
    throw new ApiError(403, "เฉพาะผู้โดยสารเท่านั้นที่สามารถรีวิวได้");
  }

  const { bookingId, rating, comment } = req.body;

  if (!bookingId) throw new ApiError(400, "กรุณาระบุ bookingId");
  if (rating === undefined || rating === null) throw new ApiError(400, "กรุณาระบุ rating");

  try {
    const review = await reviewService.createReview({
      reviewerId,
      bookingId,
      rating: Number(rating),
      comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    throw new ApiError(err.statusCode || 500, err.message);
  }
});

// ─────────────────────────────────────────────
// GET /api/reviews/driver/:driverId
// ดู reviews ของ driver (ทุกคนดูได้)
// ─────────────────────────────────────────────

const getDriverReviews = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  const { page, limit, sortBy, sortOrder } = req.query;

  const result = await reviewService.getDriverReviews(driverId, {
    page:      Number(page)  || 1,
    limit:     Number(limit) || 10,
    sortBy:    sortBy    || "createdAt",
    sortOrder: sortOrder || "desc",
  });

  res.status(200).json({ success: true, ...result });
});

// ─────────────────────────────────────────────
// GET /api/reviews/booking/:bookingId
// ตรวจสอบว่า booking นี้รีวิวแล้วหรือยัง
// ─────────────────────────────────────────────

const getReviewByBooking = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewByBooking(req.params.bookingId);
  res.status(200).json({ success: true, data: review }); // null = ยังไม่รีวิว
});

// ─────────────────────────────────────────────
// GET /api/reviews/my
// Passenger ดู reviews ที่ตัวเองเขียน
// ─────────────────────────────────────────────

const getMyReviews = asyncHandler(async (req, res) => {
  const reviewerId = req.user.id ?? req.user.sub;
  const { page, limit } = req.query;

  const result = await reviewService.getMyReviews(reviewerId, {
    page:  Number(page)  || 1,
    limit: Number(limit) || 10,
  });

  res.status(200).json({ success: true, ...result });
});

// ─────────────────────────────────────────────
// GET /api/reviews (Admin)
// ─────────────────────────────────────────────

const getAllReviews = asyncHandler(async (req, res) => {
  const { page, limit, driverId, rating, sortBy, sortOrder } = req.query;

  const result = await reviewService.getAllReviews({
    page:      Number(page)  || 1,
    limit:     Number(limit) || 20,
    driverId,
    rating,
    sortBy,
    sortOrder,
  });

  res.status(200).json({ success: true, ...result });
});

// ─────────────────────────────────────────────
// DELETE /api/reviews/:id (Admin)
// ─────────────────────────────────────────────

const deleteReview = asyncHandler(async (req, res) => {
  try {
    const deleted = await reviewService.deleteReview(req.params.id);
    res.status(200).json({ success: true, message: "ลบ review สำเร็จ", data: deleted });
  } catch (err) {
    throw new ApiError(err.statusCode || 500, err.message);
  }
});

module.exports = {
  createReview,
  getDriverReviews,
  getReviewByBooking,
  getMyReviews,
  getAllReviews,
  deleteReview,
};