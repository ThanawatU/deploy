const { prisma } = require('./prisma');
const { logger } = require('./logger');
const { getNow } = require('./timestamp');

const {
  computeAccessHash, 
  prepareLogHashes,
} = require("../services/logIntegrity.service.js")

const {
  getLatestSystemLogHash,
  getLatestAccessLogHash,
} = require("../middlewares/audit.tools.js")


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
    const loginTime = getNow();
    
    const data = {
      userId,
      loginTime,
      logoutTime: null,
      ipAddress,
      userAgent: userAgent?.substring(0, 500) || null,
      sessionId,
      createdAt: loginTime
    }

    const prevHash      = await getLatestAccessLogHash();
    const integrityHash = computeAccessHash(data, prevHash);
    data.integrityHash = integrityHash;
    data.prevHash = prevHash;
    await prisma.accessLog.create({
      data
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
const logLogout = async ({ userId, ipAddress, userAgent }) => {
  try {
    const logoutTime = getNow();

    const loginLog = await prisma.accessLog.findFirst({
      where: {
        userId,
        logoutTime: null   // ← เอา sessionId filter ออก
      },
      orderBy: { loginTime: 'desc' }
    });

    const data = {
      loginTime:  loginLog?.loginTime ?? logoutTime,
      logoutTime,
      ipAddress:  loginLog?.ipAddress ?? ipAddress ?? "unknown",
      userAgent:  loginLog?.userAgent ?? userAgent ?? null,
      sessionId:  loginLog?.sessionId ?? null,
      createdAt:  logoutTime,
      user: { connect: { id: userId } } 
    };

    const prevHash      = await getLatestAccessLogHash();
    const integrityHash = computeAccessHash(data, prevHash);
    data.integrityHash  = integrityHash;
    data.prevHash       = prevHash;

    await prisma.accessLog.create({ data });
  } catch (error) {
    logger.error('AccessLog logout record failed', {
      error: error.message,
      userId
    });
  }
};
module.exports = { logLogin, logLogout };
