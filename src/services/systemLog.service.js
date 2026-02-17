const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');

const logRequest = ({
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
  prisma.systemLog.create({
    data: {
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
      metadata
    }
  }).catch(err => {
    logger.error('SystemLog write failed', {
      error: err.message,
      requestId
    });
  });
};

module.exports = { logRequest };
