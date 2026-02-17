const { logAudit } = require('../services/audit.service');

/**
 * Helper function สำหรับบันทึก Audit Log อัตโนมัติ
 * ช่วยให้เรียก logAudit ง่ายขึ้นและลดซ้ำซ้อน
 *
 * @param {Object} options - ตัวเลือก
 * @param {string} options.userId - User ID
 * @param {string} options.role - User role (PASSENGER, DRIVER, ADMIN)
 * @param {string} options.action - Action name (CREATE_USER, UPDATE_BOOKING, etc)
 * @param {string} options.entity - Entity type (User, Booking, Route, etc)
 * @param {string} options.entityId - Entity ID
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<void>}
 */
const auditLog = async ({
  userId,
  role,
  action,
  entity,
  entityId,
  req,
  metadata = {}
}) => {
  try {
    await logAudit({
      userId,
      role,
      action,
      entity,
      entityId,
      req,
      metadata
    });
  } catch (error) {
    // Audit log failures shouldn't break functionality
    console.warn(`Audit log error for action ${action}:`, error.message);
  }
};

/**
 * Extractor function เพื่อดึง user info จาก request
 *
 * @param {Object} req - Express request object
 * @returns {Object} { userId, role }
 */
const getUserFromRequest = (req) => {
  return {
    userId: req.user?.sub || null,
    role: req.user?.role || null
  };
};

module.exports = { auditLog, getUserFromRequest };
