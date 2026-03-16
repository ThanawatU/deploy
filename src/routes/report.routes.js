const express = require('express');
const reportController = require('../controllers/report.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin } = require('../middlewares/auth');

const {
  createReportSchema,
  adminDecisionSchema,
  addReportEvidenceSchema
} = require('../validations/report.validation');

const router = express.Router();

// --- User Routes ---

// 1. สร้าง Report (รองรับทั้งคนเดียวและหลายคนผ่าน reportedUserIds)
router.post(
  '/', 
  protect, 
  validate({ body: createReportSchema }), 
  reportController.createReport
);

// 2. ดึงประวัติที่ตัวเองไปรีพอร์ตคนอื่น
router.get(
  '/my',
  protect,
  reportController.getMyReports
);

// 3. ดึงประวัติที่ตัวเองถูกคนอื่นรีพอร์ต
router.get(
  '/against-me', 
  protect, 
  reportController.getReportsAgainstMe
);

// 4. อัปโหลดหลักฐาน (รองรับทั้งส่งเข้า ID รายคน หรือส่งเข้า GroupID)
router.post(
  '/:id/evidence', 
  protect, 
  validate({ body: addReportEvidenceSchema }), 
  reportController.addEvidence
);

// 5. ผู้ใช้ยกเลิก Report ด้วยตัวเอง (ต้องเป็นสถานะ PENDING เท่านั้น)
router.patch(
  '/:id/cancel',
  protect,
  reportController.cancelReport
);

// 6. ดึงรายงานทั้งหมดของ Trip นั้นๆ (ดึงผ่าน routeId)
router.get(
  '/route/:routeId', 
  protect, 
  reportController.getReportsByRouteId
);

// 7. ดูรายละเอียด Report รายเคส (ดึงผ่าน ID หลักของเคสนั้นๆ)
router.get(
  '/:id', 
  protect, 
  reportController.getReportById
);


// --- Admin Routes ---

// 0. ดึงรายการ Trip ทั้งหมดที่มี Report 
router.get(
  '/admin/trips',
  protect,
  requireAdmin,
  reportController.getTripsWithReports
);

// 1. ดึงรายการรีพอร์ตทั้งหมดสำหรับแอดมิน
router.get(
  '/admin/all', 
  protect, 
  requireAdmin, 
  reportController.getReports
);

// 2. แอดมินรับเรื่อง (เปลี่ยนสถานะ PENDING -> UNDER_REVIEW)
router.patch(
  '/admin/:id/assign',
  protect,
  requireAdmin,
  reportController.assignReport
);

// 3. แอดมินอนุมัติเคส (RESOLVED + แจกใบเหลืองอัตโนมัติ)
router.patch(
  '/admin/:id/resolve', 
  protect, 
  requireAdmin, 
  validate({ body: adminDecisionSchema }), 
  reportController.resolveReport
);

// 4. แอดมินปฏิเสธเคส (REJECTED)
router.patch(
  '/admin/:id/reject', 
  protect, 
  requireAdmin, 
  validate({ body: adminDecisionSchema }), 
  reportController.rejectReport
);

module.exports = router;