const { prisma } = require("../utils/prisma");
const crypto = require("crypto");
const { logger } = require("../utils/logger");

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"; // 64 zeros

const getSecret = () => {
  const secret = process.env.AUDIT_LOG_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUDIT_LOG_SECRET must be set in production");
  }
  return secret || "default-audit-secret-dev-only";
};

// ─────────────────────────────────────────────
// Hash Computation
// ─────────────────────────────────────────────

/**
 * คำนวณ HMAC-SHA256 สำหรับ AuditLog record
 * field ที่ใช้ hash ต้องครบ — เปลี่ยน field ใด field นึงแล้ว hash จะไม่ตรง
 */
const computeAuditHash = (record, prevHash = GENESIS_HASH) => {
  const payload = JSON.stringify({
    id:        record.id,
    userId:    record.userId    ?? null,
    role:      record.role      ?? null,
    action:    record.action,
    entity:    record.entity    ?? null,
    entityId:  record.entityId  ?? null,
    ipAddress: record.ipAddress ?? null,
    metadata:  record.metadata  ?? null,
    createdAt: record.createdAt instanceof Date
      ? record.createdAt.toISOString()
      : record.createdAt,
    prevHash,
  });
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
};

/**
 * คำนวณ HMAC-SHA256 สำหรับ SystemLog record
 */
const computeSystemLogHash = (record, prevHash = GENESIS_HASH) => {
  const payload = JSON.stringify({
    id:         record.id,
    level:      record.level,
    method:     record.method     ?? null,
    path:       record.path       ?? null,
    statusCode: record.statusCode ?? null,
    userId:     record.userId     ?? null,
    ipAddress:  record.ipAddress  ?? null,
    createdAt:  record.createdAt instanceof Date
      ? record.createdAt.toISOString()
      : record.createdAt,
    prevHash,
  });
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
};

/**
 * คำนวณ HMAC-SHA256 สำหรับ AccessLog record
 */
const computeAccessHash = (record, prevHash = GENESIS_HASH) => {
  const payload = JSON.stringify({
    id:        record.id,
    userId:    record.userId,
    loginTime: record.loginTime instanceof Date
      ? record.loginTime.toISOString()
      : record.loginTime,
    ipAddress: record.ipAddress ?? null,
    sessionId: record.sessionId ?? null,
    createdAt: record.createdAt instanceof Date
      ? record.createdAt.toISOString()
      : record.createdAt,
    prevHash,
  });
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
};

// Map ชื่อ table → compute function
const HASH_FUNCTIONS = {
  AuditLog:  computeAuditHash,
  SystemLog: computeSystemLogHash,
  AccessLog: computeAccessHash,
};

// ─────────────────────────────────────────────
// Write Helpers (ใช้ใน service อื่น)
// ─────────────────────────────────────────────

/**
 * ดึง integrityHash ล่าสุดของ table นั้น
 * ใช้เป็น prevHash สำหรับ record ใหม่
 */
const getLatestHash = async (model) => {
  const latest = await model.findFirst({
    orderBy: { createdAt: "desc" },
    select:  { integrityHash: true },
  });
  return latest?.integrityHash ?? GENESIS_HASH;
};

/**
 * สร้าง integrityHash + prevHash สำหรับ record ใหม่
 * เรียกก่อน prisma.XXX.create() ทุกครั้ง
 *
 * ตัวอย่าง:
 *   const hashes = await prepareLogHashes('AuditLog', recordData);
 *   await prisma.auditLog.create({ data: { ...recordData, ...hashes } });
 */
const prepareLogHashes = async (tableName, recordData) => {
  const modelMap = {
    AuditLog:  prisma.auditLog,
    SystemLog: prisma.systemLog,
    AccessLog: prisma.accessLog,
  };

  const model      = modelMap[tableName];
  const computeFn  = HASH_FUNCTIONS[tableName];

  if (!model || !computeFn) {
    throw new Error(`Unknown log table: ${tableName}`);
  }

  const prevHash      = await getLatestHash(model);
  const integrityHash = computeFn(recordData, prevHash);

  return { integrityHash, prevHash };
};

// ─────────────────────────────────────────────
// Single Record Verification
// ─────────────────────────────────────────────

/**
 * ตรวจสอบ integrity ของ AuditLog record เดี่ยว
 * คืน { valid, reason, record }
 */
const verifyAuditLog = async (id) => {
  const record = await prisma.auditLog.findUnique({ where: { id } });
  if (!record) return { valid: false, reason: "NOT_FOUND", record: null };

  if (!record.integrityHash) {
    return { valid: false, reason: "NO_HASH", record };
  }

  const expected = computeAuditHash(record, record.prevHash ?? GENESIS_HASH);
  const valid    = expected === record.integrityHash;

  return {
    valid,
    reason: valid ? null : "HASH_MISMATCH",
    record,
    // expose expected hash เฉพาะ dev เพื่อ debug
    ...(process.env.NODE_ENV !== "production" && !valid ? { expected } : {}),
  };
};

// ─────────────────────────────────────────────
// Chain Verification (ตรวจทั้ง chain)
// ─────────────────────────────────────────────

/**
 * ตรวจสอบ hash chain ของทุก record ใน table
 * ตรวจว่า prevHash ของแต่ละ record ตรงกับ integrityHash ของ record ก่อนหน้า
 *
 * @param {'AuditLog'|'SystemLog'|'AccessLog'} tableName
 * @param {{ dateFrom?, dateTo?, limit? }} opts
 */
const verifyChain = async (tableName, opts = {}) => {
  const { dateFrom, dateTo, limit = 10000 } = opts;

  const modelMap = {
    AuditLog:  prisma.auditLog,
    SystemLog: prisma.systemLog,
    AccessLog: prisma.accessLog,
  };

  const model     = modelMap[tableName];
  const computeFn = HASH_FUNCTIONS[tableName];

  if (!model || !computeFn) throw new Error(`Unknown log table: ${tableName}`);

  const where = {
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
      },
    }),
  };

  const records = await model.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take:    limit,
  });

  if (!records.length) {
    return { tableName, total: 0, valid: 0, broken: 0, gaps: [], brokenChain: [] };
  }

  let valid       = 0;
  let broken      = 0;
  const brokenChain = [];
  const gaps        = [];

  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    // ตรวจ gap — prevHash ไม่ตรงกับ hash ของ record ก่อนหน้า
    if (i > 0 && rec.prevHash !== expectedPrev) {
      gaps.push({
        index:    i,
        id:       rec.id,
        expected: expectedPrev,
        actual:   rec.prevHash,
        createdAt: rec.createdAt,
      });
    }

    if (!rec.integrityHash) {
      broken++;
      brokenChain.push({ id: rec.id, createdAt: rec.createdAt, reason: "NO_HASH" });
      // ถ้าไม่มี hash ใช้ GENESIS ต่อ (อย่าทำให้ทั้ง chain พัง)
      expectedPrev = rec.integrityHash ?? expectedPrev;
      continue;
    }

    const recomputed = computeFn(rec, rec.prevHash ?? GENESIS_HASH);
    if (recomputed !== rec.integrityHash) {
      broken++;
      brokenChain.push({
        id:        rec.id,
        createdAt: rec.createdAt,
        reason:    "HASH_MISMATCH",
      });
    } else {
      valid++;
    }

    expectedPrev = rec.integrityHash;
  }

  return {
    tableName,
    total:      records.length,
    valid,
    broken,
    chainIntact: gaps.length === 0 && broken === 0,
    gaps:        gaps.slice(0, 50),       // ส่งสูงสุด 50 gaps
    brokenChain: brokenChain.slice(0, 50),
  };
};

// ─────────────────────────────────────────────
// Full Compliance Report
// ─────────────────────────────────────────────

/**
 * สร้าง Compliance Report ครอบคลุมทุก log table
 * เหมาะสำหรับ audit, regulator, หรือ scheduled check
 *
 * @param {{ dateFrom?, dateTo? }} opts
 */
const generateComplianceReport = async (opts = {}) => {
  const startedAt = new Date();

  logger.info("Compliance report generation started", opts);

  // รัน chain verify ทั้ง 3 table พร้อมกัน
  const [auditResult, systemResult, accessResult] = await Promise.all([
    verifyChain("AuditLog",  opts),
    verifyChain("SystemLog", opts),
    verifyChain("AccessLog", opts),
  ]);

  // นับ records ที่ไม่มี hash (สร้างก่อนระบบ integrity เปิด)
  const [auditNoHash, systemNoHash, accessNoHash] = await Promise.all([
    prisma.auditLog.count({ where: {
      integrityHash: null,
      ...buildDateFilter(opts),
    }}),
    prisma.systemLog.count({ where: {
      integrityHash: null,
      ...buildDateFilter(opts),
    }}),
    prisma.accessLog.count({ where: {
      integrityHash: null,
      ...buildDateFilter(opts),
    }}),
  ]);

  const completedAt = new Date();
  const durationMs  = completedAt - startedAt;

  const totalRecords  = auditResult.total  + systemResult.total  + accessResult.total;
  const totalValid    = auditResult.valid   + systemResult.valid   + accessResult.valid;
  const totalBroken   = auditResult.broken  + systemResult.broken  + accessResult.broken;
  const totalNoHash   = auditNoHash + systemNoHash + accessNoHash;
  const overallIntact = auditResult.chainIntact && systemResult.chainIntact && accessResult.chainIntact;

  const report = {
    reportId:   crypto.randomUUID(),
    generatedAt: completedAt.toISOString(),
    durationMs,
    period: {
      from: opts.dateFrom ?? "beginning",
      to:   opts.dateTo   ?? "now",
    },

    // ─── Overall Status ───
    overallStatus: overallIntact && totalBroken === 0 ? "PASS" : "FAIL",
    summary: {
      totalRecords,
      totalValid,
      totalBroken,
      totalNoHash,
      integrityRate: totalRecords > 0
        ? `${((totalValid / totalRecords) * 100).toFixed(2)}%`
        : "N/A",
    },

    // ─── Per-Table Results ───
    tables: {
      AuditLog: {
        ...auditResult,
        recordsWithoutHash: auditNoHash,
        status: auditResult.chainIntact && auditResult.broken === 0 ? "PASS" : "FAIL",
      },
      SystemLog: {
        ...systemResult,
        recordsWithoutHash: systemNoHash,
        status: systemResult.chainIntact && systemResult.broken === 0 ? "PASS" : "FAIL",
      },
      AccessLog: {
        ...accessResult,
        recordsWithoutHash: accessNoHash,
        status: accessResult.chainIntact && accessResult.broken === 0 ? "PASS" : "FAIL",
      },
    },

    // ─── Findings ───
    findings: buildFindings({ auditResult, systemResult, accessResult, totalNoHash }),

    // ─── Recommendations ───
    recommendations: buildRecommendations({
      totalBroken, totalNoHash, overallIntact,
      auditResult, systemResult, accessResult,
    }),
  };

  logger.info("Compliance report generated", {
    reportId:      report.reportId,
    overallStatus: report.overallStatus,
    durationMs,
  });

  return report;
};

// ─────────────────────────────────────────────
// Helpers for Report
// ─────────────────────────────────────────────

const buildDateFilter = ({ dateFrom, dateTo } = {}) => ({
  ...((dateFrom || dateTo) && {
    createdAt: {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    },
  }),
});

const buildFindings = ({ auditResult, systemResult, accessResult, totalNoHash }) => {
  const findings = [];

  for (const result of [auditResult, systemResult, accessResult]) {
    if (result.broken > 0) {
      findings.push({
        severity: "HIGH",
        table:    result.tableName,
        type:     "HASH_MISMATCH",
        count:    result.broken,
        message:  `พบ ${result.broken} records ที่ integrity hash ไม่ตรง ใน ${result.tableName} — อาจถูกแก้ไขหลัง insert`,
        affectedIds: result.brokenChain.slice(0, 10).map(r => r.id),
      });
    }
    if (result.gaps.length > 0) {
      findings.push({
        severity: "HIGH",
        table:    result.tableName,
        type:     "CHAIN_GAP",
        count:    result.gaps.length,
        message:  `พบ ${result.gaps.length} gap ใน hash chain ของ ${result.tableName} — อาจมี record ถูกลบ`,
        affectedIds: result.gaps.slice(0, 10).map(r => r.id),
      });
    }
  }

  if (totalNoHash > 0) {
    findings.push({
      severity: "LOW",
      table:    "ALL",
      type:     "MISSING_HASH",
      count:    totalNoHash,
      message:  `พบ ${totalNoHash} records ที่ไม่มี integrityHash — อาจสร้างก่อนระบบ integrity เปิดใช้`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "INFO",
      type:     "ALL_CLEAR",
      message:  "ไม่พบปัญหา integrity ทุก log record ผ่านการตรวจสอบ",
    });
  }

  return findings;
};

const buildRecommendations = ({
  totalBroken, totalNoHash, overallIntact,
  auditResult, systemResult, accessResult,
}) => {
  const recs = [];

  if (totalBroken > 0) {
    recs.push("ควรตรวจสอบ records ที่ hash ไม่ตรงทันที และ freeze access จนกว่าจะสืบสวนเสร็จ");
    recs.push("ตรวจสอบ access log ของ database user ในช่วงเวลาที่พบ mismatch");
  }

  for (const result of [auditResult, systemResult, accessResult]) {
    if (result.gaps.length > 0) {
      recs.push(`พบ chain gap ใน ${result.tableName} — ตรวจสอบว่ามี record ถูกลบหรือไม่ และตรวจสอบ DB trigger`);
    }
  }

  if (totalNoHash > 0) {
    recs.push(`มี ${totalNoHash} records ที่ไม่มี hash — พิจารณา backfill hash สำหรับ records เก่า`);
  }

  if (overallIntact && totalBroken === 0 && totalNoHash === 0) {
    recs.push("ระบบ integrity อยู่ในสถานะดี ควรรัน compliance report ทุกสัปดาห์");
  }

  return recs;
};

// ─────────────────────────────────────────────
// Backfill (สำหรับ records เก่าที่ยังไม่มี hash)
// ─────────────────────────────────────────────

/**
 * เพิ่ม integrityHash ให้ records เก่าที่ยังไม่มี hash
 * รันครั้งเดียวหลัง deploy ระบบ integrity
 * ต้องรัน SEBELUM เปิด immutable trigger
 *
 * @param {'AuditLog'|'SystemLog'|'AccessLog'} tableName
 * @param {{ batchSize? }} opts
 */
const backfillHashes = async (tableName, opts = {}) => {
  const { batchSize = 500 } = opts;

  const modelMap = {
    AuditLog:  prisma.auditLog,
    SystemLog: prisma.systemLog,
    AccessLog: prisma.accessLog,
  };
  const computeFn = HASH_FUNCTIONS[tableName];
  const model     = modelMap[tableName];

  if (!model || !computeFn) throw new Error(`Unknown log table: ${tableName}`);

  logger.info(`Starting hash backfill for ${tableName}...`);

  let processed = 0;
  let cursor    = undefined;

  // ถ้า trigger เปิดอยู่แล้ว ต้อง disable ก่อน
  while (true) {
    const records = await model.findMany({
      where:   { integrityHash: null },
      orderBy: { createdAt: "asc" },
      take:    batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (!records.length) break;

    // คำนวณ hash chain สำหรับ batch นี้
    // หา prevHash ของ record แรกใน batch
    let prevHash = GENESIS_HASH;
    if (processed > 0) {
      // ดึง hash ของ record ก่อนหน้า batch แรก
      const lastProcessed = await model.findFirst({
        where:   { integrityHash: { not: null } },
        orderBy: { createdAt: "desc" },
        select:  { integrityHash: true },
      });
      prevHash = lastProcessed?.integrityHash ?? GENESIS_HASH;
    }

    for (const rec of records) {
      const integrityHash = computeFn(rec, prevHash);

      // ใช้ $executeRaw bypass trigger
      if (tableName === "AuditLog") {
        await prisma.$executeRaw`
          UPDATE "AuditLog"
          SET "integrityHash" = ${integrityHash}, "prevHash" = ${prevHash}
          WHERE id = ${rec.id}
        `;
      } else if (tableName === "SystemLog") {
        await prisma.$executeRaw`
          UPDATE "SystemLog"
          SET "integrityHash" = ${integrityHash}, "prevHash" = ${prevHash}
          WHERE id = ${rec.id}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "AccessLog"
          SET "integrityHash" = ${integrityHash}, "prevHash" = ${prevHash}
          WHERE id = ${rec.id}
        `;
      }

      prevHash = integrityHash;
    }

    processed += records.length;
    cursor     = records[records.length - 1].id;

    logger.info(`Backfill progress: ${processed} records processed for ${tableName}`);
  }

  logger.info(`Backfill complete for ${tableName}: ${processed} records updated`);
  return { tableName, processed };
};

// ─────────────────────────────────────────────
// Updated logRetention (ใช้ DB function bypass trigger)
// ─────────────────────────────────────────────

const cleanupOldLogs = async (retentionDays = 90) => {
  try {
    logger.info(`Starting log retention cleanup (${retentionDays} days)`);

    const result = await prisma.$queryRaw`
      SELECT cleanup_logs_older_than(${retentionDays})
    `;

    const counts = result[0]?.cleanup_logs_older_than ?? {};
    logger.info("Log retention cleanup finished", counts);
    return counts;
  } catch (error) {
    logger.error("Log retention cleanup failed", { error: error.message });
    throw error;
  }
};

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

module.exports = {
  // hash computation (ใช้ใน service อื่น)
  computeAuditHash,
  computeSystemLogHash,
  computeAccessHash,
  prepareLogHashes,
  GENESIS_HASH,

  // verification
  verifyAuditLog,
  verifyChain,

  // compliance
  generateComplianceReport,

  // maintenance
  backfillHashes,
  cleanupOldLogs,
};