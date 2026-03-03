const cron = require("node-cron");
const { generateComplianceReport, cleanupOldLogs } = require("../services/logIntegrity.service");
const { logger } = require("../utils/logger");

const scheduleIntegrityChecks = () => {

  // ─── Weekly Compliance Report — ทุกวันจันทร์ 02:00 น. ───
  cron.schedule("0 2 * * 1", async () => {
    logger.info("Weekly compliance check started");
    try {
      const report = await generateComplianceReport({
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (report.overallStatus === "FAIL") {
        logger.error("COMPLIANCE FAIL — integrity issues detected", {
          reportId:    report.reportId,
          summary:     report.summary,
          findings:    report.findings,
        });
        // TODO: ส่ง alert ไปยัง Slack / Email / PagerDuty
      } else {
        logger.info("Weekly compliance check PASSED", {
          reportId:    report.reportId,
          totalRecords: report.summary.totalRecords,
          integrityRate: report.summary.integrityRate,
        });
      }
    } catch (err) {
      logger.error("Compliance check failed", { error: err.message });
    }
  });

  // Daily Log Retention — ทุกวัน 03:00 น. 
  cron.schedule("0 3 * * *", async () => {
    logger.info("Log retention cleanup started");
    try {
      const result = await cleanupOldLogs(90);
      logger.info("Log retention complete", result);
    } catch (err) {
      logger.error("Log retention failed", { error: err.message });
    }
  });

  logger.info("Integrity scheduler registered (weekly check + daily retention)");
};

module.exports = { scheduleIntegrityChecks };