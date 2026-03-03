/**
 * Timestamp Standard Utility
 * 
 * มาตรฐาน Timestamp สำหรับระบบ Audit Log
 * - Timezone: Asia/Bangkok (UTC+7)
 * - Format: ISO 8601 with timezone offset (e.g. "2026-02-27T11:30:00.000+07:00")
 * - ใช้ getNow() แทน new Date() ในทุกจุดที่สร้าง log
 * - ใช้ toISO() สำหรับแปลงเป็น string ที่มี timezone offset ชัดเจน
 */

const TIMEZONE = 'Asia/Bangkok';
const TIMEZONE_OFFSET = '+07:00';
const TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in ms

/**
 * สร้าง Date object ปัจจุบัน
 * Docker ตั้ง TZ=Asia/Bangkok อยู่แล้ว แต่ function นี้เป็น single source of truth
 * @returns {Date}
 */
const getNow = () => new Date();

/**
 * แปลง Date เป็น ISO 8601 string พร้อม timezone offset Asia/Bangkok
 * เช่น "2026-02-27T11:30:00.000+07:00" แทน "2026-02-27T04:30:00.000Z"
 * 
 * @param {Date} [date] - Date object (default: now)
 * @returns {string} ISO 8601 string with +07:00 offset
 */
const toISO = (date) => {
  const d = date || getNow();
  const bangkokTime = new Date(d.getTime() + TIMEZONE_OFFSET_MS);
  const iso = bangkokTime.toISOString().replace('Z', TIMEZONE_OFFSET);
  return iso;
};

/**
 * สร้าง Date range สำหรับ filter ตาม date string (YYYY-MM-DD)
 * ใช้ timezone Asia/Bangkok (+07:00) ให้ตรงกับมาตรฐาน
 * 
 * @param {string} dateString - วันที่ format "YYYY-MM-DD"
 * @returns {{ start: Date, end: Date }}
 */
const toDateRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000${TIMEZONE_OFFSET}`);
  const end = new Date(`${dateString}T23:59:59.999${TIMEZONE_OFFSET}`);
  return { start, end };
};

module.exports = {
  TIMEZONE,
  TIMEZONE_OFFSET,
  getNow,
  toISO,
  toDateRange
};
