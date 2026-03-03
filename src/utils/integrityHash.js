const crypto = require('crypto');

/**
 * ฟิลด์ที่ใช้คำนวณ integrity hash (เรียงตาม deterministic order)
 * ครอบคลุมทุกฟิลด์ business data ใน AuditLog
 */
const HASH_FIELDS = [
  'id',
  'userId',
  'role',
  'action',
  'entity',
  'entityId',
  'ipAddress',
  'userAgent',
  'metadata',
  'createdAt'
];

/**
 * คำนวณ SHA-256 integrity hash จาก AuditLog record
 *
 * @param {Object} record - AuditLog record จาก Prisma
 * @returns {string} 64-char hex SHA-256 hash
 */
const computeIntegrityHash = (record) => {
  const payload = HASH_FIELDS.reduce((acc, field) => {
    let value = record[field];

    if (value === undefined || value === null) {
      acc[field] = null;
    } else if (value instanceof Date) {
      acc[field] = value.toISOString();
    } else {
      acc[field] = value;
    }

    return acc;
  }, {});

  const jsonString = JSON.stringify(payload);
  return crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
};

/**
 * ตรวจสอบว่า AuditLog record ยังคงถูกต้อง (ไม่ถูกแก้ไข)
 *
 * @param {Object} record - AuditLog record ที่มี integrityHash
 * @returns {{ isValid: boolean, expected: string, actual: string|null }}
 */
const verifyIntegrityHash = (record) => {
  const expected = computeIntegrityHash(record);
  const actual = record.integrityHash || null;

  return {
    isValid: expected === actual,
    expected,
    actual
  };
};

module.exports = { computeIntegrityHash, verifyIntegrityHash };
