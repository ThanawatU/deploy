/**
 * auditAccess.middleware.js
 *
 * Fine-grained access control middleware สำหรับระบบ Log
 *
 * ลำดับ permission:
 *   ADMIN  → เข้าถึงได้ทุก log ทุก action
 *   DRIVER → ดูเฉพาะ activity log ของตัวเองได้ (ผ่าน getUserActivity)
 *   PASSENGER → ดูเฉพาะ activity log ของตัวเองได้
 *
 * Middleware นี้ออกแบบให้ใช้คู่กับ protect (ตรวจสอบ token แล้ว)
 */

const ApiError = require("../utils/ApiError");

// ─────────────────────────────────────────────
// Admin-only guard
// ─────────────────────────────────────────────

/**
 * ให้เฉพาะ ADMIN ผ่าน
 */
const adminOnly = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  if (req.user.role !== "ADMIN") return next(new ApiError(403, "Admin access required"));
  next();
};

// ─────────────────────────────────────────────
// Self-or-admin guard
// ─────────────────────────────────────────────

/**
 * ให้ ADMIN หรือ user ที่ req.params.userId === token.sub ผ่าน
 * ใช้บน route ที่มี :userId
 */
const selfOrAdmin = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));

  const { role, id } = req.user;

  if (role === "ADMIN") return next();
  if (req.params.userId && req.params.userId === id) return next();

  next(new ApiError(403, "Forbidden: you can only access your own logs"));
};

// ─────────────────────────────────────────────
// Rate-limit guard for sensitive endpoints
// (ป้องกัน scraping export หรือ integrity-report ถี่เกินไป)
// ─────────────────────────────────────────────

const sensitiveActionCounts = new Map(); // in-memory, production ควรใช้ Redis

/**
 * Simple in-memory rate limiter: max `maxPerWindow` calls per userId per `windowMs`
 */
const sensitiveRateLimit = (maxPerWindow = 10, windowMs = 60 * 1000) => {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const key = req.user.id;
    const now = Date.now();
    const entry = sensitiveActionCounts.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      sensitiveActionCounts.set(key, { count: 1, windowStart: now });
      return next();
    }

    entry.count++;
    if (entry.count > maxPerWindow) {
      return next(
        new ApiError(429, `Too many requests. Max ${maxPerWindow} per ${windowMs / 1000}s`)
      );
    }
    next();
  };
};

// ─────────────────────────────────────────────
// Log-type guard (ป้องกัน non-admin ขอ export SystemLog/AccessLog)
// ─────────────────────────────────────────────

/**
 * Middleware ที่ใช้ใน export request:
 * PASSENGER/DRIVER ขอ export ได้เฉพาะ logType === "AuditLog" (activity ตัวเอง)
 * และต้องแนบ filters.userId === ตัวเอง
 * ADMIN ขอได้ทุก type
 */
const exportAccessGuard = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));

  const { role, id } = req.user;
  if (role === "ADMIN") return next();

  const { logType, filters } = req.body;

  if (logType !== "AuditLog") {
    return next(new ApiError(403, "Non-admin users can only export their own AuditLog records"));
  }

  // บังคับ filter userId ให้เป็นตัวเอง
  if (!filters || filters.userId !== id) {
    return next(
      new ApiError(403, "filters.userId must match your own user id when exporting as non-admin")
    );
  }

  next();
};

// ─────────────────────────────────────────────
// Audit log viewer guard (ตรวจว่า user มีสิทธิ์ดู log ของ userId ที่ query มา)
// ─────────────────────────────────────────────

/**
 * ใช้บน listAuditLogs:
 * ถ้า role !== ADMIN บังคับ query.userId === ตัวเอง และ strip ออก query param อื่นที่อันตราย
 */
const auditListGuard = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));

  const { role, id } = req.user;
  if (role === "ADMIN") return next();

  // Non-admin: scope ลง userId ตัวเอง
  req.query.userId = id;

  // ลบ query param ที่ non-admin ไม่ควรใช้
  delete req.query.ipAddress;
  delete req.query.q;

  next();
};

module.exports = {
  adminOnly,
  selfOrAdmin,
  sensitiveRateLimit,
  exportAccessGuard,
  auditListGuard,
};