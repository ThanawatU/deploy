const express = require('express');
const exportController = require('../controllers/export.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin } = require('../middlewares/auth');

const {
  createExportRequestSchema,
  listExportRequestsSchema,
  exportIdParamSchema,
  rejectExportSchema
} = require('../validations/export.validation');

const router = express.Router();

// POST /api/exports — สร้าง export request ใหม่
router.post(
  '/',
  protect,
  requireAdmin,
  validate({ body: createExportRequestSchema }),
  exportController.createExportRequest
);

// GET /api/exports — ดูรายการ export requests
router.get(
  '/',
  protect,
  requireAdmin,
  validate({ query: listExportRequestsSchema }),
  exportController.listExportRequests
);

// GET /api/exports/:id — ดู export request ตาม ID
router.get(
  '/:id',
  protect,
  requireAdmin,
  validate({ params: exportIdParamSchema }),
  exportController.getExportRequestById
);

// PATCH /api/exports/:id/approve — อนุมัติ export request
router.patch(
  '/:id/approve',
  protect,
  requireAdmin,
  validate({ params: exportIdParamSchema }),
  exportController.approveExportRequest
);

// PATCH /api/exports/:id/reject — ปฏิเสธ export request
router.patch(
  '/:id/reject',
  protect,
  requireAdmin,
  validate({ params: exportIdParamSchema, body: rejectExportSchema }),
  exportController.rejectExportRequest
);

// GET /api/exports/:id/download — ดาวน์โหลดไฟล์ export
router.get(
  '/:id/download',
  protect,
  requireAdmin,
  validate({ params: exportIdParamSchema }),
  exportController.downloadExport
);

module.exports = router;
