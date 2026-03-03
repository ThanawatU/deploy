const express = require('express');
const integrityController = require('../controllers/integrity.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin } = require('../middlewares/auth');
const { adminOnly, sensitiveRateLimit } = require("../middlewares/auditAccess.middleware");
const { query, param } = require("express-validator");

const {
  verifyLogParamSchema,
  verifyBatchQuerySchema
} = require('../validations/integrity.validation');

const router = express.Router();

// GET /api/integrity/verify — ตรวจสอบ integrity แบบ batch
router.get(
  '/verify',
  protect,
  requireAdmin,
  validate({ query: verifyBatchQuerySchema }),
  integrityController.verifyBatchLogs
);

// GET /api/integrity/verify/:id — ตรวจสอบ integrity record เดียว
router.get(
  '/verify/:id',
  protect,
  requireAdmin,
  validate({ params: verifyLogParamSchema }),
  integrityController.verifySingleLog
);

// ทุก route ต้องผ่าน protect + adminOnly
router.use(protect, adminOnly);

const dateRules = [
  query("dateFrom").optional().isISO8601().withMessage("dateFrom must be ISO8601"),
  query("dateTo").optional().isISO8601().withMessage("dateTo must be ISO8601"),
];

/**
 * GET /api/logs/integrity/audit/:id
 * ตรวจสอบ record เดี่ยว
 */
router.get(
  "/audit/:id",
  sensitiveRateLimit(30, 60_000),
  integrityController.verifyOne
);

/**
 * GET /api/logs/integrity/chain/:table
 * ตรวจสอบ hash chain ทั้ง table
 * :table = audit | system | access
 */
router.get(
  "/chain/:table",
  sensitiveRateLimit(5, 60_000),   // max 5 ครั้ง/นาที (หนักมาก)
  [
    param("table").isIn(["audit", "system", "access"]),
    query("limit").optional().isInt({ min: 1, max: 50000 }).toInt(),
    ...dateRules,
  ],
  validate,
  integrityController.verifyChain
);

/**
 * GET /api/logs/integrity/compliance-report
 * Full compliance report ทุก table
 */
router.get(
  "/compliance-report",
  sensitiveRateLimit(3, 60_000),   // max 3 ครั้ง/นาที (หนักมาก)
  dateRules,
  validate,
  integrityController.complianceReport
);

/**
 * POST /api/logs/integrity/backfill/:table
 * Backfill hash สำหรับ records เก่า (maintenance)
 */
router.post(
  "/backfill/:table",
  sensitiveRateLimit(1, 300_000),  // max 1 ครั้ง/5 นาที
  [param("table").isIn(["audit", "system", "access"])],
  validate,
  integrityController.backfill
);

module.exports = router;
