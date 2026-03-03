/**
 * Metadata Standard Utility
 * 
 * มาตรฐาน Metadata สำหรับระบบ Audit Log
 * กำหนดโครงสร้าง metadata JSON ที่ใช้ร่วมกันทุก log type
 * 
 * Schema มาตรฐาน:
 * 
 * AuditLog metadata:
 *   { version, action?, fields?, before?, after?, ...extra }
 * 
 * SystemLog metadata:
 *   { version, query?, params?, ...extra }
 * 
 * AccessLog metadata:
 *   { version, ...extra }
 */

const METADATA_VERSION = '1.0';

/**
 * ลบ key ที่มีค่า undefined ออกจาก object
 * @param {Object} obj
 * @returns {Object}
 */
const stripUndefined = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * สร้าง metadata มาตรฐานสำหรับ AuditLog
 * 
 * @param {Object} options
 * @param {string} [options.action] - ชื่อ action เพิ่มเติม
 * @param {string[]} [options.fields] - fields ที่ถูกแก้ไข
 * @param {Object} [options.before] - ค่าก่อนแก้ไข
 * @param {Object} [options.after] - ค่าหลังแก้ไข
 * @returns {Object}
 */
const buildAuditMetadata = ({ action, fields, before, after, ...extra } = {}) => {
  return stripUndefined({
    version: METADATA_VERSION,
    action,
    fields,
    before,
    after,
    ...extra
  });
};

/**
 * สร้าง metadata มาตรฐานสำหรับ SystemLog
 * 
 * @param {Object} options
 * @param {Object} [options.query] - query parameters
 * @param {Object} [options.params] - route parameters
 * @returns {Object}
 */
const buildSystemLogMetadata = ({ query, params, ...extra } = {}) => {
  return stripUndefined({
    version: METADATA_VERSION,
    query,
    params,
    ...extra
  });
};

/**
 * สร้าง metadata มาตรฐานสำหรับ AccessLog
 * 
 * @param {Object} [options]
 * @returns {Object}
 */
const buildAccessLogMetadata = (extra = {}) => {
  return stripUndefined({
    version: METADATA_VERSION,
    ...extra
  });
};

module.exports = {
  METADATA_VERSION,
  buildAuditMetadata,
  buildSystemLogMetadata,
  buildAccessLogMetadata,
  stripUndefined
};
