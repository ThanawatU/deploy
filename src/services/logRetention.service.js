const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * ฟังก์ชันลบ Log ที่มีอายุเกิน 90 วัน
 */
const cleanupOldLogs = async () => {
  const retentionPeriod = 90; 
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - retentionPeriod);

  try {
    logger.info(`Starting log retention cleanup (older than ${thresholdDate.toISOString()})`);

    // 1. ลบ SystemLog
    const systemLogs = await prisma.systemLog.deleteMany({
      where: { createdAt: { lt: thresholdDate } }
    });

    // 2. ลบ AccessLog
    const accessLogs = await prisma.accessLog.deleteMany({
      where: { createdAt: { lt: thresholdDate } }
    });

    // 3. ลบ AuditLog
    const deletedAuditLogs = await prisma.$executeRaw`
      DELETE FROM "AuditLog"
      WHERE "createdAt" < NOW() - INTERVAL '90 days'
    `;

    logger.info('Log retention cleanup finished', {
      deletedSystemLogs: systemLogs.count,
      deletedAccessLogs: accessLogs.count,
      deletedAuditLogs: deletedAuditLogs
    });

  } catch (error) {
    logger.error('Log retention cleanup failed', { error: error.message });
  }
};

module.exports = { cleanupOldLogs };