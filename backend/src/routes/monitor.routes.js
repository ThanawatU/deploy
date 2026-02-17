const express = require("express");
const router = express.Router();
const { prisma } = require("../utils/prisma");

router.get("/logs", async (req, res) => {
  try {
    const { level = "ALL", type = "SystemLog", date } = req.query;

    const modelMap = {
      AuditLog: prisma.auditLog,
      AccessLog: prisma.accessLog,
      SystemLog: prisma.systemLog,
    };

    const model = modelMap[type] || prisma.systemLog;

    const where = {};

    if (type === "SystemLog" && level !== "ALL") {
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

    const logs = await model.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formattedLogs = logs.map((log) => {
      if (type === "AuditLog") {
        return {
          id: log.id,
          createdAt: log.createdAt,
          userId: log.userId,
          role: log.role,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
        };
      }

      if (type === "AccessLog") {
        return {
          id: log.id,
          createdAt: log.createdAt,
          userId: log.userId,
          loginTime: log.loginTime,
          logoutTime: log.logoutTime,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          sessionId: log.sessionId,
        };
      }

      // SystemLog
      return {
        id: log.id,
        createdAt: log.createdAt,
        userId: log.userId,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        duration: log.duration,
        level: log.level,
        requestId: log.requestId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        error: log.error,
        metadata: log.metadata,
      };
    });

    res.json(formattedLogs);
  } catch (error) {
    console.error("Fetch logs error:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

router.get("/logs/summary", async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const total = await prisma.systemLog.count();

    const errorCount = await prisma.systemLog.count({
      where: {
        level: "ERROR",
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    const avgData = await prisma.systemLog.aggregate({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      _avg: { duration: true },
    });

    const avgResponse = avgData._avg.duration || 0;

    res.json({
      total,
      errorCount,
      avgResponse: Math.round(avgResponse),
      highError: errorCount > 10,
      highLatency: avgResponse > 2000,
    });
  } catch (error) {
    console.error("Fetch summary error:", error);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

module.exports = router;
