const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');
const { getNow } = require('../utils/timestamp');
const {
  computeSystemLogHash, 
  prepareLogHashes,
} = require("../services/logIntegrity.service.js")

const {
  getLatestSystemLogHash,
} = require("../middlewares/audit.tools.js")




const logRequest = async ({
  level = 'INFO',
  requestId,
  method,
  path,
  statusCode,
  duration,
  userId,
  ipAddress,
  userAgent,
  error,
  metadata
}) => {
  const createdAt = getNow();

   const data = {
      level,
      requestId,
      method,
      path,
      statusCode,
      duration,
      userId,
      ipAddress,
      userAgent,
      error,
      metadata,
      createdAt
    }
  const prevHash      = await getLatestSystemLogHash();
  const integrityHash = computeSystemLogHash(data, prevHash);
  data.integrityHash = integrityHash;
  data.prevHash = prevHash;
  prisma.systemLog.create({
    data : data,
  }).catch(err => {
    logger.error('SystemLog write failed', {
      error: err.message,
      requestId
    });
  });
};

module.exports = { logRequest };
