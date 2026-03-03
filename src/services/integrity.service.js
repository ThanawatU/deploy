const { prisma } = require("../utils/prisma");
const ApiError = require("../utils/ApiError");
const { verifyIntegrityHash } = require("../utils/integrityHash");

/**
 * ตรวจสอบ integrity ของ AuditLog record เดียว
 *
 * @param {string} id - AuditLog ID
 * @returns {Promise<Object>} ผลการตรวจสอบ
 */
const verifySingleLog = async (id) => {
  const record = await prisma.auditLog.findUnique({
    where: { id }
  });

  if (!record) {
    throw new ApiError(404, 'Audit log not found');
  }

  const result = verifyIntegrityHash(record);

  return {
    id: record.id,
    action: record.action,
    entity: record.entity,
    createdAt: record.createdAt,
    integrityHash: record.integrityHash,
    isValid: result.isValid,
    ...(result.isValid ? {} : { expectedHash: result.expected })
  };
};

/**
 * ตรวจสอบ integrity ของ AuditLog records แบบ batch พร้อม pagination
 *
 * @param {Object} options
 * @param {number} options.page - หน้าที่ต้องการ (default: 1)
 * @param {number} options.limit - จำนวนต่อหน้า (default: 50)
 * @param {string} [options.startDate] - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} [options.endDate] - วันที่สิ้นสุด (YYYY-MM-DD)
 * @returns {Promise<Object>} ผลการตรวจสอบพร้อม summary
 */
const verifyBatchLogs = async ({ page = 1, limit = 50, startDate, endDate }) => {
  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(`${startDate}T00:00:00.000+07:00`);
    }
    if (endDate) {
      where.createdAt.lte = new Date(`${endDate}T23:59:59.999+07:00`);
    }
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  let validCount = 0;
  let invalidCount = 0;
  let missingHashCount = 0;

  const results = records.map((record) => {
    if (!record.integrityHash) {
      missingHashCount++;
      return {
        id: record.id,
        action: record.action,
        entity: record.entity,
        createdAt: record.createdAt,
        isValid: false,
        reason: 'MISSING_HASH'
      };
    }

    const result = verifyIntegrityHash(record);

    if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    return {
      id: record.id,
      action: record.action,
      entity: record.entity,
      createdAt: record.createdAt,
      isValid: result.isValid,
      ...(result.isValid ? {} : { reason: 'HASH_MISMATCH' })
    };
  });

  return {
    summary: {
      total,
      checked: records.length,
      valid: validCount,
      invalid: invalidCount,
      missingHash: missingHashCount
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    records: results
  };
};

module.exports = { verifySingleLog, verifyBatchLogs };
