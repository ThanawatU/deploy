const { prisma } = require('./prisma');
const { logger } = require('./logger');

/**
 * บันทึก login ของผู้ใช้ไปยัง AccessLog
 */
const logLogin = async ({
  userId,
  ipAddress,
  userAgent,
  sessionId
}) => {
  try {
    // Login time + 90 days = expiration
    const loginTime = new Date();

    await prisma.accessLog.create({
      data: {
        userId,
        loginTime,
        logoutTime: null,
        ipAddress,
        userAgent: userAgent?.substring(0, 500) || null,
        sessionId,
        createdAt: loginTime
      }
    });
  } catch (error) {
    logger.error('AccessLog login record failed', {
      error: error.message,
      userId
    });
  }
};

/**
 * บันทึก logout ของผู้ใช้ไปยัง AccessLog
 */
const logLogout = async ({
  userId,
  sessionId
}) => {
  try {
    const logoutTime = new Date();

    // หาเซสชันที่ล่าสุด
    const accessLog = await prisma.accessLog.findFirst({
      where: {
        userId,
        ...(sessionId ? { sessionId } : {}),
        logoutTime: null // ยังไม่ logout
      },
      orderBy: {
        loginTime: 'desc'
      }
    });

    if (accessLog) {
      await prisma.accessLog.update({
        where: {
          id: accessLog.id
        },
        data: {
          logoutTime
        }
      });
    }
  } catch (error) {
    logger.error('AccessLog logout record failed', {
      error: error.message,
      userId
    });
  }
};

module.exports = { logLogin, logLogout };
