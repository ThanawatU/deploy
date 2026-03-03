const express = require("express");
const router = express.Router();

const {
  adminOnly,
  selfOrAdmin,
  sensitiveRateLimit,
  exportAccessGuard,
  auditListGuard,
} = require("../middlewares/auditAccess.middleware");

const blacklistController = require('../controllers/blacklist.controller');
const auditController = require("../controllers/audit.controller");
const validate = require('../middlewares/validate');
const { protect, requireAdmin} = require('../middlewares/auth')
const { query, body } = require("express-validator");

// ─────────────────────────────────────────────
// Reusable validation chains
// ─────────────────────────────────────────────

const paginationRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
];

const dateRangeRules = [
  query("dateFrom").optional().isISO8601().withMessage("dateFrom must be ISO8601"),
  query("dateTo").optional().isISO8601().withMessage("dateTo must be ISO8601"),
];

// ─────────────────────────────────────────────
// Require valid token on every route
// ─────────────────────────────────────────────
router.use(protect);

// ═══════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════

/**
 * GET /api/logs/audit
 * - ADMIN  : full search with any filter
 * - Others : scoped to own userId (via auditListGuard)
 */
router.get(
  '/audit',
  auditListGuard,
  [...paginationRules, ...dateRangeRules],
  // validate,
  auditController.listAuditLogs
);

/**
 * GET /api/logs/audit/integrity-report   [ADMIN + rate-limited]
 */
router.get(
  "/audit/integrity-report",
  adminOnly,
  sensitiveRateLimit(5, 60_000),       // max 5 times per minute
  [...dateRangeRules],
  // validate,
  auditController.integrityReport
);

/**
 * GET /api/logs/audit/:id              [ADMIN]
 */
router.get("/audit/:id", adminOnly, auditController.getAuditLog);

/**
 * GET /api/logs/audit/:id/verify       [ADMIN]
 */
router.get("/audit/:id/verify", adminOnly, auditController.verifyAuditLog);

// ═══════════════════════════════════════════════
// SYSTEM LOG
// ═══════════════════════════════════════════════

/**
 * GET /api/logs/system                 [ADMIN]
 */
router.get(
  "/system",
  adminOnly,
  [...paginationRules, ...dateRangeRules],
  // validate,
  // blacklistController.getBlacklists
  auditController.listSystemLogs
);

// ═══════════════════════════════════════════════
// ACCESS LOG
// ═══════════════════════════════════════════════

/**
 * GET /api/logs/access                 [ADMIN]
 */
router.get(
  "/access",
  adminOnly,
  [...paginationRules, ...dateRangeRules],
  // validate,
  auditController.listAccessLogs
);

// ═══════════════════════════════════════════════
// STATS & TIMELINE
// ═══════════════════════════════════════════════

/**
 * GET /api/logs/stats                  [ADMIN]
 */
router.get("/stats", adminOnly, [...dateRangeRules], auditController.getStats);

/**
 * GET /api/logs/timeline               [ADMIN]
 */
router.get("/timeline", adminOnly, [...dateRangeRules], auditController.getTimeline);

// ═══════════════════════════════════════════════
// USER ACTIVITY TRAIL
// ═══════════════════════════════════════════════

/**
 * GET /api/logs/users/:userId/activity
 * - ADMIN  : any userId
 * - Self   : own userId only
 */
router.get(
  "/users/:userId/activity",
  selfOrAdmin,
  [...paginationRules, ...dateRangeRules],
  // validate,
  auditController.getUserActivity
);

// ═══════════════════════════════════════════════
// EXPORT WORKFLOW
// ═══════════════════════════════════════════════

/**
 * POST /api/logs/exports
 * - ADMIN      : any logType
 * - Non-admin  : only AuditLog with filters.userId === self  (via exportAccessGuard)
 */
router.post(
  "/exports",
  exportAccessGuard,
  [
    body("logType")
      .isIn(["AuditLog", "SystemLog", "AccessLog"])
      .withMessage("logType must be AuditLog, SystemLog, or AccessLog"),
    body("format").optional().isIn(["CSV", "JSON", "PDF"]),
    body("filters").optional().isObject(),
  ],
  // validate,
  auditController.requestExport
);

/**
 * GET /api/logs/exports
 * - ADMIN : all requests
 * - Self  : own requests only (handled inside controller)
 */
router.get(
  "/exports",
  [...paginationRules],
  // คอมเม้นต์ validate เพราะทำให้ non-admin ใช้ query.userId ไม่ได้
  // validate,
  auditController.listExportRequests
);

/**
 * PATCH /api/logs/exports/:id/review   [ADMIN]
 */
router.patch(
  "/exports/:id/review",
  adminOnly,
  [
    body("status").isIn(["APPROVED", "REJECTED"]),
    body("rejectionReason").optional().isString().isLength({ max: 500 }),
  ],
  // validate,
  auditController.reviewExport
);

/**
 * GET /api/logs/exports/:id/download
 * - ADMIN or requester (checked inside controller)
 * - rate-limited: max 3 downloads per minute per user
 */

// EDIT : แก้จาก 3 เป็น 100 (Nattaphat_0126)
router.get(
  "/exports/:id/download",
  sensitiveRateLimit(100, 60_000),
  auditController.downloadExport
);

module.exports = router;