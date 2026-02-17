const crypto = require('crypto');
const { logRequest } = require('../services/systemLog.service');
const { logger, LogLevel } = require('../utils/logger');

const EXCLUDED_PATHS = ['/health', '/metrics', '/documentation'];

const shouldSkipLogging = (path) => {
  return EXCLUDED_PATHS.some(excluded =>
    path === excluded || path.startsWith(excluded + '/')
  );
};

const requestLogger = (req, res, next) => {
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Math.round(Number(durationNs) / 1e6);

    let level = LogLevel.INFO;
    if (res.statusCode >= 500) {
      level = LogLevel.ERROR;
    } else if (res.statusCode >= 400) {
      level = LogLevel.WARN;
    }

    const query = req.query || {};
    const params = req.params || {};

    const logData = {
      level,
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: durationMs,
      userId: req.user?.sub || null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 500),
      metadata: {
       query: Object.keys(query).length > 0 ? query : undefined,
        params: Object.keys(params).length > 0 ? params : undefined
      }
    };

    logger[level.toLowerCase()](`${req.method} ${req.originalUrl}`, {
      requestId: req.requestId,
      statusCode: res.statusCode,
      duration: `${durationMs}ms`
    });

    logRequest(logData);
  });

  next();
};

module.exports = { requestLogger };
