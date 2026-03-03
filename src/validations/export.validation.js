const { z } = require("zod");

const createExportRequestSchema = z.object({
  logType: z.enum(["AuditLog", "SystemLog", "AccessLog"]),
  format: z.enum(["CSV", "JSON", "PDF"]).default("CSV"),
  filters: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    level: z.string().optional(),
    action: z.string().optional(),
    userId: z.string().optional()
  }).optional()
});

const listExportRequestsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  logType: z.string().optional()
});

const exportIdParamSchema = z.object({
  id: z.string().min(1)
});

const rejectExportSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required")
});

module.exports = {
  createExportRequestSchema,
  listExportRequestsSchema,
  exportIdParamSchema,
  rejectExportSchema
};
