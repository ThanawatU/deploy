const { prisma } = require("../utils/prisma");
const { getNow } = require("../utils/timestamp");
const PDFDocument = require('pdfkit');
const { LOG_COLUMNS } = require('../utils/exportGenerators');
const { computeIntegrityHash } = require("../utils/integrityHash");
const {
  computeAuditHash, 
  prepareLogHashes,
} = require("./logIntegrity.service.js")

const {
  getLatestAuditHash
} = require("../middlewares/audit.tools.js")


const logAudit = async ({ userId, role, action, entity, entityId, req, metadata }) => {
  try {
    const createdAt = new Date();

    const data = {
      userId:    userId    ?? null,
      role:      role      ?? null,
      action,
      entity:    entity    ?? null,
      entityId:  entityId  ?? null,
      ipAddress: req?.ip                      ?? null,
      userAgent: req?.headers?.["user-agent"] ?? null,
      metadata:  metadata  ?? null,
      createdAt,
    };

    const prevHash      = await getLatestAuditHash();
    const integrityHash = computeAuditHash(data, prevHash);

    await prisma.auditLog.create({
      data: { ...data, integrityHash, prevHash },
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

// ─────────────────────────────────────────────
// Search & Filter
// ─────────────────────────────────────────────

/**
 * ค้นหา AuditLog พร้อม filter / pagination
 *
 * opts: {
 *   page, limit,
 *   userId, role, action, entity, entityId,
 *   ipAddress,
 *   dateFrom, dateTo,
 *   q,                 // full-text search ใน action/entity/entityId
 *   sortBy, sortOrder
 * }
 */
const searchAuditLogs = async (opts = {}) => {
  const {
    page = 1,
    limit = 50,
    userId,
    role,
    action,
    entity,
    entityId,
    ipAddress,
    dateFrom,
    dateTo,
    q,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = opts;

  // allowlist sortBy เพื่อป้องกัน injection
  const ALLOWED_SORT = ["createdAt", "action", "entity", "role"];
  const safeSortBy = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const where = {
    ...(userId && { userId }),
    ...(role && { role }),
    ...(entity && { entity }),
    ...(entityId && { entityId }),
    ...(ipAddress && { ipAddress: { contains: ipAddress } }),
    // action รองรับ partial match
    ...(action && { action: { contains: action, mode: "insensitive" } }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    }),
    ...(q && {
      OR: [
        { action: { contains: q, mode: "insensitive" } },
        { entity: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { ipAddress: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  const [total, data] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { [safeSortBy]: safeSortOrder },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * ค้นหา SystemLog
 */
const searchSystemLogs = async (opts = {}) => {
  const {
    page = 1,
    limit = 50,
    level,
    userId,
    statusCode,
    method,
    path,
    requestId,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = opts;

  const ALLOWED_SORT = ["createdAt", "level", "statusCode", "duration"];
  const safeSortBy = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const where = {
    ...(level && { level }),
    ...(userId && { userId }),
    ...(statusCode && { statusCode: Number(statusCode) }),
    ...(method && { method: method.toUpperCase() }),
    ...(path && { path: { contains: path, mode: "insensitive" } }),
    ...(requestId && { requestId }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [total, data] = await prisma.$transaction([
    prisma.systemLog.count({ where }),
    prisma.systemLog.findMany({
      where,
      orderBy: { [safeSortBy]: safeSortOrder },
      skip,
      take: limit,
    }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * ค้นหา AccessLog
 */
const searchAccessLogs = async (opts = {}) => {
  const {
    page = 1,
    limit = 50,
    userId,
    ipAddress,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = opts;

  const ALLOWED_SORT = ["createdAt", "loginTime", "logoutTime"];
  const safeSortBy = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const where = {
    ...(userId && { userId }),
    ...(ipAddress && { ipAddress: { contains: ipAddress } }),
    ...((dateFrom || dateTo) && {
      loginTime: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [total, data] = await prisma.$transaction([
    prisma.accessLog.count({ where }),
    prisma.accessLog.findMany({
      where,
      orderBy: { [safeSortBy]: safeSortOrder },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────
// Single Record
// ─────────────────────────────────────────────

const getAuditLogById = async (id) => {
  return prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });
};

// ─────────────────────────────────────────────
// Integrity Verification
// ─────────────────────────────────────────────

/**
 * ตรวจสอบความสมบูรณ์ของ AuditLog record
 * คืนค่า { valid: boolean, log }
 */
const verifyLogIntegrity = async (id) => {
  const log = await prisma.auditLog.findUnique({ where: { id } });
  if (!log) return { valid: false, log: null, reason: "NOT_FOUND" };

  if (!log.integrityHash) {
    return { valid: false, log, reason: "NO_HASH" };
  }

  const expected = computeIntegrityHash(log);
  const valid = expected === log.integrityHash;

  return {
    valid,
    log,
    reason: valid ? null : "HASH_MISMATCH",
    expected: process.env.NODE_ENV === "development" ? expected : undefined,
  };
};

/**
 * ตรวจสอบ batch (ทุก record ที่ไม่มี hash หรือ hash ผิด)
 * คืนจำนวน tampered และ records ที่มีปัญหา (limit 100)
 */
const auditIntegrityReport = async ({ dateFrom, dateTo } = {}) => {
  const where = {
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    }),
  };

  const logs = await prisma.auditLog.findMany({ where });

  let total = logs.length;
  let tamperedCount = 0;
  let missingHashCount = 0;
  const tampered = [];

  for (const log of logs) {
    if (!log.integrityHash) {
      missingHashCount++;
      continue;
    }
    const expected = computeIntegrityHash(log);
    if (expected !== log.integrityHash) {
      tamperedCount++;
      if (tampered.length < 100) {
        tampered.push({ id: log.id, createdAt: log.createdAt, action: log.action });
      }
    }
  }

  return {
    total,
    valid: total - tamperedCount - missingHashCount,
    tampered: tamperedCount,
    missingHash: missingHashCount,
    tamperedRecords: tampered,
  };
};

// ─────────────────────────────────────────────
// Statistics / Dashboard
// ─────────────────────────────────────────────

/**
 * Summary stats สำหรับ admin dashboard
 */
const getAuditStats = async ({ dateFrom, dateTo } = {}) => {
  const dateFilter =
    dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {};

  const [
    totalAuditLogs,
    totalSystemLogs,
    totalAccessLogs,
    auditByAction,
    auditByRole,
    systemByLevel,
    recentErrors,
  ] = await Promise.all([
    prisma.auditLog.count({ where: dateFilter }),
    prisma.systemLog.count({ where: dateFilter }),
    prisma.accessLog.count({ where: dateFilter }),

    // Top 10 actions
    prisma.auditLog.groupBy({
      by: ["action"],
      where: dateFilter,
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
      take: 10,
    }),

    // By role
    prisma.auditLog.groupBy({
      by: ["role"],
      where: dateFilter,
      _count: { role: true },
    }),

    // SystemLog by level
    prisma.systemLog.groupBy({
      by: ["level"],
      where: dateFilter,
      _count: { level: true },
    }),

    // Recent ERROR logs (last 10)
    prisma.systemLog.findMany({
      where: { ...dateFilter, level: "ERROR" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        method: true,
        path: true,
        statusCode: true,
        userId: true,
        error: true,
      },
    }),
  ]);

  return {
    totals: {
      auditLogs: totalAuditLogs,
      systemLogs: totalSystemLogs,
      accessLogs: totalAccessLogs,
    },
    auditByAction: auditByAction.map((r) => ({
      action: r.action,
      count: r._count.action,
    })),
    auditByRole: auditByRole.map((r) => ({
      role: r.role,
      count: r._count.role,
    })),
    systemByLevel: systemByLevel.map((r) => ({
      level: r.level,
      count: r._count.level,
    })),
    recentErrors,
  };
};

/**
 * Activity timeline: นับ AuditLog แต่ละวันในช่วงที่กำหนด (max 90 วัน)
 */
const getActivityTimeline = async ({ dateFrom, dateTo } = {}) => {
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo ? new Date(dateTo) : new Date();

  const rows = await prisma.$queryRaw`
    SELECT DATE("createdAt")::text AS day, COUNT(*)::int AS count
    FROM "AuditLog"
    WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
    GROUP BY day
    ORDER BY day ASC
  `;

  return rows;
};

// ─────────────────────────────────────────────
// Export Request Workflow
// ─────────────────────────────────────────────

const createExportRequest = async ({ requestedById, logType, format = "CSV", filters = {} }) => {
  const ALLOWED_TYPES = ["AuditLog", "SystemLog", "AccessLog"];
  if (!ALLOWED_TYPES.includes(logType)) {
    throw new Error(`Invalid logType: ${logType}`);
  }

  return prisma.exportRequest.create({
    data: {
      requestedById,
      logType,
      format,
      filters,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expire ใน 7 วัน
    },
  });
};

const getExportRequests = async (opts = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    requestedById,
    logType,
    sortOrder = "desc",
  } = opts;

  const where = {
    ...(status && { status }),
    ...(requestedById && { requestedById }),
    ...(logType && { logType }),
  };

  const skip = (page - 1) * limit;

  const [total, data] = await prisma.$transaction([
    prisma.exportRequest.count({ where }),
    prisma.exportRequest.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
      include: {
        requestedBy: { select: { id: true, username: true, email: true, role: true } },
        reviewedBy: { select: { id: true, username: true, email: true } },
      },
    }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const reviewExportRequest = async (id, { reviewedById, status, rejectionReason }) => {
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new Error("status ต้องเป็น APPROVED หรือ REJECTED");
  }

  return prisma.exportRequest.update({
    where: { id },
    data: {
      status,
      reviewedById,
      reviewedAt: new Date(),
      ...(rejectionReason ? { rejectionReason } : {}),
    },
  });
};

/**
 * ประมวลผล export: ดึงข้อมูลจริง แปลงเป็น CSV/JSON แล้ว return buffer พร้อมข้อมูล
 * (บันทึก filePath ออก S3/local ทำที่ controller ได้)
 */
const processExport = async (exportRequestId) => {
  const req = await prisma.exportRequest.findUnique({ where: { id: exportRequestId } });
  if (!req) throw new Error("ExportRequest not found");
  if (req.status !== "APPROVED") throw new Error("ExportRequest is not approved");

  const filters = req.filters || {};
  let records = [];

  if (req.logType === "AuditLog") {
    const result = await searchAuditLogs({ ...filters, page: 1, limit: 100000 });
    records = result.data;
  } else if (req.logType === "SystemLog") {
    const result = await searchSystemLogs({ ...filters, page: 1, limit: 100000 });
    records = result.data;
  } else if (req.logType === "AccessLog") {
    const result = await searchAccessLogs({ ...filters, page: 1, limit: 100000 });
    records = result.data;
  }

  let content;
  let mimeType;

  if (req.format === "CSV") {
    content = convertToCSV(records);
    mimeType = "text/csv";
  } else if (req.format === "JSON") {
    content = JSON.stringify(records, null, 2);
    mimeType = "application/json";
  } else if (req.format === "PDF") {
    content = await generatePDFBuffer(records, req.logType);
    mimeType = "application/pdf";
  }

  // อัปเดต status เป็น APPROVED
  await prisma.exportRequest.update({
    where: { id: exportRequestId },
    data: {
      status: "APPROVED",
      completedAt: new Date(),
      recordCount: records.length,
    },
  });

  return { content, mimeType, recordCount: records.length, format: req.format };
};

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────

function convertToCSV(rows) {
  if (!rows.length) return "";

  // flatten ฟิลด์แบบ shallow (JSON fields จะถูก stringify)
  const flatRow = (r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
        out[k] = JSON.stringify(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  const flat = rows.map(flatRow);
  const headers = Object.keys(flat[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    headers.join(","),
    ...flat.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];

  return lines.join("\n");
}

// ─────────────────────────────────────────────
// User Activity (per-user audit trail)
// ─────────────────────────────────────────────

const getUserActivityLog = async (userId, opts = {}) => {
  const { page = 1, limit = 30, dateFrom, dateTo } = opts;

  const where = {
    userId,
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [total, data] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const logSystem = async ({
  level = "INFO", requestId, method, path,
  statusCode, duration, userId, ipAddress,
  userAgent, error, metadata,
}) => {
  try {
    const createdAt = new Date();
    const recordData = {
      level, requestId, method, path, statusCode,
      duration, userId, ipAddress, userAgent,
      error: error ?? null,
      metadata: metadata ?? null,
      createdAt,
    };

    

    await prisma.systemLog.create({
      data: { ...recordData, integrityHash, prevHash },
    });
  } catch (err) {
    console.error("SystemLog write failed:", err.message);
  }
};

/**
 * สร้าง pdgเป็น memory buffer
 */
function generatePDFBuffer(records, logType) {
  return new Promise((resolve, reject) => {
    try {
      const columns = LOG_COLUMNS[logType];
      if (!columns) return reject(new Error(`Unknown log type: ${logType}`));

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(16).text(`${logType} Export Report`, { align: 'center' });
      doc.fontSize(10).text(`Exported at: ${new Date().toISOString()}`, { align: 'center' });
      doc.fontSize(10).text(`Total records: ${records.length}`, { align: 'center' });
      doc.moveDown(1);

      const maxCols = 7;
      const displayHeaders = columns.headers.slice(0, maxCols);
      const displayFields = columns.fields.slice(0, maxCols);
      const tableLeft = 30;
      const pageWidth = doc.page.width - 60;
      const colWidth = Math.floor(pageWidth / displayHeaders.length);
      const rowHeight = 20;

      const formatValue = (value) => {
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      };

      const drawTableHeader = (y) => {
        doc.fontSize(8).font('Helvetica-Bold');
        displayHeaders.forEach((header, i) => {
          doc.text(header, tableLeft + (i * colWidth), y, { width: colWidth - 4, lineBreak: false });
        });
        doc.font('Helvetica');
        return y + rowHeight;
      };

      let currentY = drawTableHeader(doc.y);
      doc.fontSize(7);

      for (const record of records) {
        if (currentY + rowHeight > doc.page.height - 40) {
          doc.addPage();
          currentY = drawTableHeader(30);
          doc.fontSize(7);
        }
        displayFields.forEach((field, i) => {
          const value = formatValue(record[field]);
          const displayValue = value.length > 30 ? value.substring(0, 27) + '...' : value;
          doc.text(displayValue, tableLeft + (i * colWidth), currentY, { width: colWidth - 4, lineBreak: false });
        });
        currentY += rowHeight;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  // core write
  logAudit,
  // search
  searchAuditLogs,
  searchSystemLogs,
  searchAccessLogs,
  // single record
  getAuditLogById,
  // integrity
  verifyLogIntegrity,
  auditIntegrityReport,
  // stats
  getAuditStats,
  getActivityTimeline,
  // export workflow
  createExportRequest,
  getExportRequests,
  reviewExportRequest,
  processExport,
  // user activity
  getUserActivityLog,
  logSystem
};











