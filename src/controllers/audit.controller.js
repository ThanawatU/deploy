const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/ApiError");
const auditService = require("../services/audit.service");

// ──────────
// AuditLog
// ──────────
/**
 * GET /api/logs/audit
 * Query: page, limit, userId, role, action, entity, entityId,
 *        ipAddress, dateFrom, dateTo, q, sortBy, sortOrder
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const opts = {
    ...req.query,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: Math.min(Number(req.query.limit) || 50, 200),
  };

  const result = await auditService.searchAuditLogs(opts);
  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/logs/audit/:id
 */
const getAuditLog = asyncHandler(async (req, res) => {
  const log = await auditService.getAuditLogById(req.params.id);
  if (!log) throw new ApiError(404, "AuditLog not found");
  res.status(200).json({ success: true, data: log });
});

/**
 * GET /api/logs/audit/:id/verify
 * ตรวจสอบ integrity hash ของ log record นั้น
 */
const verifyAuditLog = asyncHandler(async (req, res) => {
  const result = await auditService.verifyLogIntegrity(req.params.id);
  if (!result.log) throw new ApiError(404, "AuditLog not found");
  res.status(200).json({ success: true, data: result });
});

/**
 * GET /api/logs/audit/integrity-report
 * ตรวจสอบ batch integrity (admin only)
 * Query: dateFrom, dateTo
 */
const integrityReport = asyncHandler(async (req, res) => {
  const result = await auditService.auditIntegrityReport(req.query);
  res.status(200).json({ success: true, data: result });
});

// ──────────
// SystemLog
// ──────────

/**
 * GET /api/logs/system
 * Query: page, limit, level, userId, statusCode, method, path, requestId,
 *        dateFrom, dateTo, sortBy, sortOrder
 */
const listSystemLogs = asyncHandler(async (req, res) => {
  const opts = {
    ...req.query,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: Math.min(Number(req.query.limit) || 50, 200),
    statusCode: req.query.statusCode ? Number(req.query.statusCode) : undefined,
  };

  const result = await auditService.searchSystemLogs(opts);
  res.status(200).json({ success: true, ...result });
});

// ──────────
// AccessLog
// ──────────

/**
 * GET /api/logs/access
 * Query: page, limit, userId, ipAddress, dateFrom, dateTo, sortBy, sortOrder
 */
const listAccessLogs = asyncHandler(async (req, res) => {
  const opts = {
    ...req.query,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: Math.min(Number(req.query.limit) || 50, 200),
  };

  const result = await auditService.searchAccessLogs(opts);
  res.status(200).json({ success: true, ...result });
});

// ──────────
// Statistics & Dashboard
// ──────────

/**
 * GET /api/logs/stats
 * Query: dateFrom, dateTo
 */
const getStats = asyncHandler(async (req, res) => {
  const result = await auditService.getAuditStats(req.query);
  res.status(200).json({ success: true, data: result });
});

/**
 * GET /api/logs/timeline
 * Query: dateFrom, dateTo
 */
const getTimeline = asyncHandler(async (req, res) => {
  const result = await auditService.getActivityTimeline(req.query);
  res.status(200).json({ success: true, data: result });
});

// ─────────────────────────────────────────────
// User Activity (self or admin view)
// ─────────────────────────────────────────────

/**
 * GET /api/logs/users/:userId/activity
 * - ADMIN: ดูของใครก็ได้
 * - User: ดูได้เฉพาะตัวเอง (userId ตรงกับ token)
 */
const getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.id || req.user.sub; // เผื่อ token ถอดรหัสมาแล้วไม่มี .sub ให้สลับไปใช้ .id
  const requesterRole = req.user.role;

  if (requesterRole !== "ADMIN" && requesterId !== userId) {
    throw new ApiError(403, "Forbidden: cannot view other user's activity");
  }

  const opts = {
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 30, 100),
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  };

  const result = await auditService.getUserActivityLog(userId, opts);
  res.status(200).json({ success: true, ...result });
});

// ──────────
// Export Workflow
// ──────────

/**
 * POST /api/logs/exports
 * body: { logType, format, filters }
 */
const requestExport = asyncHandler(async (req, res) => {
  const { logType, format, filters } = req.body;

  if (!logType) throw new ApiError(400, "logType is required");

  let exportRequest = await auditService.createExportRequest({
    requestedById: req.user.id,
    logType,
    format: format || "CSV",
    filters: filters || {},
  });

  if (req.user.role === "ADMIN") {
    exportRequest = await auditService.reviewExportRequest(exportRequest.id, {
      reviewedById: req.user.id, 
      status: "APPROVED",
      rejectionReason: "Auto-approved for ADMIN role"
    });

    return res.status(201).json({
      success: true,
      message: "Export request auto-approved and ready for download.",
      data: exportRequest,
    });
  }

  res.status(201).json({
    success: true,
    message: "Export request submitted. Pending admin approval.",
    data: exportRequest,
  });
});

/**
 * GET /api/logs/exports
 * Query: page, limit, status, logType
 * ADMIN: ดูทั้งหมด | User: ดูเฉพาะของตัวเอง
 */
const listExportRequests = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "ADMIN";

  const opts = {
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 20, 100),
    status: req.query.status,
    logType: req.query.logType,
    requestedById: isAdmin ? req.query.requestedById : req.user.id,
  };

  const result = await auditService.getExportRequests(opts);
  res.status(200).json({ success: true, ...result });
});

/**
 * PATCH /api/logs/exports/:id/review
 * body: { status: "APPROVED" | "REJECTED", rejectionReason? }
 * ADMIN only
 */
/**
 * PATCH /api/logs/exports/:id/review
 * body: { status: "APPROVED" | "REJECTED", rejectionReason? }
 * ADMIN only
 */
const reviewExport = asyncHandler(async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new ApiError(400, 'status must be "APPROVED" or "REJECTED"');
    }

    // เผื่อ token ถอดรหัสมาแล้วไม่มี .sub ให้สลับไปใช้ .id หรือ null
    const adminId = req.user?.sub || req.user?.id || null;

    const updated = await auditService.reviewExportRequest(req.params.id, {
      reviewedById: adminId,
      status,
      rejectionReason,
    });

    res.status(200).json({ success: true, data: updated });
    
  } catch (error) {
    console.error("reviewExport Error: ", error.message || error);
    throw error;
  }
});

/**
 * GET /api/logs/exports/:id/download
 * ประมวลผลและ stream ไฟล์ออกมาเลย (สำหรับ APPROVED request เท่านั้น)
 * เฉพาะ requester เองหรือ ADMIN
 */
const downloadExport = asyncHandler(async (req, res) => {
  // ตรวจสอบ ownership
  const { prisma } = require("../utils/prisma");
  const exportReq = await prisma.exportRequest.findUnique({ where: { id: req.params.id } });

  if (!exportReq) throw new ApiError(404, "Export request not found");
  if (req.user.role !== "ADMIN" && exportReq.requestedById !== req.user.id) {
    throw new ApiError(403, "Forbidden");
  }
  if (exportReq.status !== "APPROVED") {
    throw new ApiError(400, `Export request is ${exportReq.status}, not APPROVED`);
  }

  const { content, mimeType, recordCount, format } = await auditService.processExport(req.params.id);

  let ext = "csv";
  if (format === "JSON") ext = "json";
  if (format === "PDF") ext = "pdf";
  
  const filename = `${exportReq.logType}_export_${Date.now()}.${ext}`;

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("X-Record-Count", String(recordCount));
  res.send(content);
});

module.exports = {
  listAuditLogs,
  getAuditLog,
  verifyAuditLog,
  integrityReport,
  listSystemLogs,
  listAccessLogs,
  getStats,
  getTimeline,
  getUserActivity,
  requestExport,
  listExportRequests,
  reviewExport,
  downloadExport,
};