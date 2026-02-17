const monitorService = require("../services/monitor.service");

exports.getLogs = async (req, res) => {
  try {
    const {
      level = "ALL",
      type = "SystemLog",
      date,
    } = req.query;

    const filters = {
      level,
      date,
    };

    let logs;

    switch (type) {
      case "AuditLog":
        logs = await monitorService.getLatestAuditLogs(filters);
        break;

      case "AccessLog":
        logs = await monitorService.getLatestAccessLogs(filters);
        break;

      case "SystemLog":
      default:
        logs = await monitorService.getLatestSystemLogs(filters);
        break;
    }

    return res.json(logs);
  } catch (error) {
    console.error("getLogs controller error:", error);
    return res.status(500).json({
      message: "Failed to fetch logs",
    });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const summary = await monitorService.getSystemSummary();
    return res.json(summary);
  } catch (error) {
    console.error("getSummary controller error:", error);
    return res.status(500).json({
      message: "Failed to fetch summary",
    });
  }
};
