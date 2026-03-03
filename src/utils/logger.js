const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};
const { toISO } = require('./timestamp');

const shouldLogToConsole = () => {
  const envValue = process.env.LOG_TO_CONSOLE;
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  // Default: true in development, false in production
  return process.env.NODE_ENV !== 'production';
};

const formatLog = (level, message, data = {}) => ({
  timestamp: toISO(),
  level,
  message,
  ...data
});

const logger = {
  info: (message, data) => {
    if (shouldLogToConsole()) {
      console.log(JSON.stringify(formatLog(LogLevel.INFO, message, data)));
    }
  },
  warn: (message, data) => {
    if (shouldLogToConsole()) {
      console.warn(JSON.stringify(formatLog(LogLevel.WARN, message, data)));
    }
  },
  error: (message, data) => {
    // Always log errors to console (safety net)
    console.error(JSON.stringify(formatLog(LogLevel.ERROR, message, data)));
  }
};

module.exports = { logger, LogLevel };
