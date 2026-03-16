const express = require('express');
const incidentController = require('../controllers/incident.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin } = require('../middlewares/auth');

const {
  createIncidentSchema,
  adminIncidentDecisionSchema,
  addIncidentEvidenceSchema
} = require('../validations/incident.validation');

const router = express.Router();

// --- User Routes ---

// 1. สร้างการแจ้งเหตุ
router.post(
  '/', 
  protect, 
  validate({ body: createIncidentSchema }), 
  incidentController.createIncident
);

// 2. ดึงประวัติการแจ้งเหตุของตัวเอง
router.get(
  '/my',
  protect,
  incidentController.getMyIncidents
);

// 3. อัปโหลดหลักฐานพิ่มเติม
router.post(
  '/:id/evidence', 
  protect, 
  validate({ body: addIncidentEvidenceSchema }), 
  incidentController.addEvidence
);

// 4. ผู้ใช้ยกเลิกการแจ้งเหตุด้วยตัวเอง
router.patch(
  '/:id/cancel',
  protect,
  incidentController.cancelIncident
);

// 5. ดูรายละเอียดการแจ้งเหตุรายเคส
router.get(
  '/:id', 
  protect, 
  incidentController.getIncidentById
);


// --- Admin Routes ---

// 1. ดึงรายการการแจ้งเหตุทั้งหมดสำหรับแอดมิน
router.get(
  '/admin/all', 
  protect, 
  requireAdmin, 
  incidentController.getIncidents
);

// 2. แอดมินรับเรื่อง (เปลี่ยนสถานะ PENDING -> UNDER_INVESTIGATION)
router.patch(
  '/admin/:id/assign',
  protect,
  requireAdmin,
  incidentController.assignIncident
);

// 3. แอดมินจัดการเสร็จสิ้น (RESOLVED)
router.patch(
  '/admin/:id/resolve', 
  protect, 
  requireAdmin, 
  validate({ body: adminIncidentDecisionSchema }), 
  incidentController.resolveIncident
);

// 4. แอดมินปฏิเสธเคส (REJECTED)
router.patch(
  '/admin/:id/reject', 
  protect, 
  requireAdmin, 
  validate({ body: adminIncidentDecisionSchema }), 
  incidentController.rejectIncident
);

module.exports = router;