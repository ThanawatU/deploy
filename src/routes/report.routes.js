const express = require('express');
const reportController = require('../controllers/report.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin } = require('../middlewares/auth');

const {
  createReportSchema,
  updateReportStatusSchema,
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

// 5. ดูรายละเอียด Report รายเคส (ดึงผ่าน ID หลักของเคสนั้นๆ)
router.get(
  '/:id', 
  protect, 
  reportController.getReportById
);


// --- Admin Routes ---

// 1. ดึงรายการรีพอร์ตทั้งหมดสำหรับแอดมิน
router.get(
  '/admin/all', 
  protect, 
  requireAdmin, 
  reportController.getReports
);

// 2. แอดมินอัปเดตสถานะ (ตัดสินเคส/แจกใบเหลือง)
router.patch(
  '/admin/:id/status', 
  protect, 
  requireAdmin, 
  validate({ body: updateReportStatusSchema }), 
  reportController.updateReportStatus
);

// assign แอดมินรับเรื่อง report
router.patch(
  '/admin/:id/assign',
  protect,
  requireAdmin,
  reportController.assignReport
);

// ให้ใบเหลือง
router.post(
  '/admin/:id/issue-yellow',
  protect,  
  requireAdmin,
  reportController.issueYellowCard
);

console.log("protect:", protect);
console.log("requireAdmin:", requireAdmin);
console.log("issueYellowCard:", reportController.issueYellowCard);

module.exports = router;