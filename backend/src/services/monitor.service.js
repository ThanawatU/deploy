const { prisma } = require("../utils/prisma");

const getLatestSystemLogs = async (filters = {}, limit = 100) => {
  try {
    const { level, date } = filters;

    const where = {};

    if (level && level !== "ALL") {
      where.level = level;
    }

    if (date) {
      const start = new Date(`${date}T00:00:00.000+07:00`);
      const end = new Date(`${date}T23:59:59.999+07:00`);

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    const logs = await prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        method: true,
        path: true,
        statusCode: true,
        duration: true,
        level: true,
        userId: true,
        ipAddress: true,
        requestId: true,
        userAgent: true,
        error: true,
        metadata: true,
      },
    });

    return logs;
  } catch (error) {
    console.error("getLatestSystemLogs error:", error);
    throw error;
  }
};



const getSystemSummary = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [total, errorCount, avgData] = await Promise.all([
      prisma.systemLog.count(),

      prisma.systemLog.count({
        where: {
          level: "ERROR",
          createdAt: { gte: fiveMinutesAgo },
        },
      }),

      prisma.systemLog.aggregate({
        where: {
          createdAt: { gte: fiveMinutesAgo },
        },
        _avg: { duration: true },
      }),
    ]);

    const avgResponse = avgData._avg.duration || 0;

    const ERROR_THRESHOLD = 10;
    const LATENCY_THRESHOLD = 2000;

    return {
      total,
      errorCount,
      avgResponse: Math.round(avgResponse),
      highError: errorCount > ERROR_THRESHOLD,
      highLatency: avgResponse > LATENCY_THRESHOLD,
    };
  } catch (error) {
    console.error("getSystemSummary error:", error);
    throw error;
  }
};

module.exports = {
  getLatestSystemLogs,
  getSystemSummary,
};
