const express = require("express");
const router  = express.Router();
const { protect } = require("../middlewares/auth");
const { adminOnly } = require("../middlewares/auditAccess.middleware");
const reviewController = require("../controllers/review.controller");

// ─── Public ───────────────────────────────────
// ดู reviews ของ driver (ไม่ต้อง login)
router.get("/driver/:driverId", reviewController.getDriverReviews);

// ─── Authenticated ────────────────────────────
router.use(protect);

// ตรวจสอบว่า booking นี้รีวิวแล้วหรือยัง
router.get("/booking/:bookingId", reviewController.getReviewByBooking);

// passenger ดู reviews ที่ตัวเองเขียน
router.get("/my", reviewController.getMyReviews);

// passenger สร้าง review
router.post("/", reviewController.createReview);

// ─── Admin ────────────────────────────────────
router.get("/",        adminOnly, reviewController.getAllReviews);
router.delete("/:id",  adminOnly, reviewController.deleteReview);

module.exports = router;