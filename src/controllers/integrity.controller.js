const integrityService = require("../services/integrity.service");
const { auditLog, getUserFromRequest } = require('../utils/auditLog');
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/ApiError");

exports.verifySingleLog = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await integrityService.verifySingleLog(id);

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VERIFY_INTEGRITY',
      entity: 'AuditLog',
      entityId: id,
      req,
      metadata: { isValid: result.isValid }
    });

    res.json({
      message: "Integrity verification completed",
      data: result
    });
  } catch (error) {
    console.error("verifySingleLog error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to verify audit log integrity"
    });
  }
};

exports.verifyBatchLogs = async (req, res) => {
  try {
    const { page, limit, startDate, endDate } = req.query;

    const result = await integrityService.verifyBatchLogs({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      startDate,
      endDate
    });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VERIFY_INTEGRITY_BATCH',
      entity: 'AuditLog',
      entityId: null,
      req,
      metadata: {
        checked: result.summary.checked,
        valid: result.summary.valid,
        invalid: result.summary.invalid
      }
    });

    res.json({
      message: "Batch integrity verification completed",
      data: result
    });
  } catch (error) {
    console.error("verifyBatchLogs error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to verify audit log integrity"
    });
  }
};

// ─────────────────────────────────────────────
// Single Record Verify
// ─────────────────────────────────────────────

/**
 * GET /api/logs/integrity/audit/:id
 * ตรวจสอบ integrity ของ AuditLog record เดี่ยว
 */
exports.verifyOne = asyncHandler(async (req, res) => {
  const result = await integrityService.verifyAuditLog(req.params.id);

  if (!result.record) throw new ApiError(404, "AuditLog not found");

  // Add Log management
  await auditLog({
    ...getUserFromRequest(req),
    action: 'VERIFY_SINGLE_LOG',
    entity: 'AuditLog',
    entityId: req.params.id,
    req,
    metadata: { isValid: result.valid }
  });

  res.status(200).json({
    success: true,
    data: {
      id:        result.record.id,
      valid:     result.valid,
      reason:    result.reason,
      createdAt: result.record.createdAt,
      ...(result.expected ? { expected: result.expected } : {}),
    },
  });
});

// ─────────────────────────────────────────────
// Chain Verification
// ─────────────────────────────────────────────

/**
 * GET /api/logs/integrity/chain/:table
 * ตรวจสอบ hash chain ของทั้ง table
 * :table = audit | system | access
 * Query: dateFrom, dateTo, limit
 */
exports.verifyChain = asyncHandler(async (req, res) => {
  const TABLE_MAP = {
    audit:  "AuditLog",
    system: "SystemLog",
    access: "AccessLog",
  };

  const tableName = TABLE_MAP[req.params.table];
  if (!tableName) throw new ApiError(400, 'table must be "audit", "system", or "access"');

  const opts = {
    dateFrom: req.query.dateFrom,
    dateTo:   req.query.dateTo,
    limit:    Math.min(Number(req.query.limit) || 10000, 50000),
  };

  const result = await integrityService.verifyChain(tableName, opts);

  // Add Log management
  await auditLog({
    ...getUserFromRequest(req),
    action: 'VERIFY_CHAIN',
    entity: 'AuditLog',
    req,
    metadata: { table: tableName }
  });

  res.status(200).json({ success: true, data: result });
});

// ─────────────────────────────────────────────
// Compliance Report
// ─────────────────────────────────────────────

/**
 * GET /api/logs/integrity/compliance-report
 * สร้าง full compliance report ทุก table
 * Query: dateFrom, dateTo
 */
exports.complianceReport = asyncHandler(async (req, res) => {
  const report = await integrityService.generateComplianceReport({
    dateFrom: req.query.dateFrom,
    dateTo:   req.query.dateTo,
  });

  // Add Log management
  await auditLog({
    ...getUserFromRequest(req),
    action: 'GENERATE_COMPLIANCE_REPORT',
    entity: 'AuditLog',
    req
  });

  // ถ้า status FAIL ส่ง HTTP 200 แต่ body บอก status FAIL
  // (ไม่ใช่ HTTP error — เป็น business result)
  res.status(200).json({ success: true, data: report });
});

// ─────────────────────────────────────────────
// Backfill (maintenance — ใช้ครั้งเดียวหลัง deploy)
// ─────────────────────────────────────────────

/**
 * POST /api/logs/integrity/backfill/:table
 * เพิ่ม hash ให้ records เก่าที่ยังไม่มี integrityHash
 * body: { batchSize? }
 * ADMIN only + ต้องรันก่อนเปิด immutable trigger
 */
exports.backfill = asyncHandler(async (req, res) => {
  const TABLE_MAP = {
    audit:  "AuditLog",
    system: "SystemLog",
    access: "AccessLog",
  };

  const tableName = TABLE_MAP[req.params.table];
  if (!tableName) throw new ApiError(400, 'table must be "audit", "system", or "access"');

  const batchSize = Math.min(Number(req.body.batchSize) || 500, 1000);

  const result = await integrityService.backfillHashes(tableName, { batchSize });

  res.status(200).json({
    success: true,
    message: `Backfill complete for ${tableName}`,
    data: result,
  });
});

//module.exports = { verifyOne, verifyChain, complianceReport, backfill };
