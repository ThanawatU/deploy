const { z } = require("zod");

const verifyLogParamSchema = z.object({
  id: z.string().min(1)
});

const verifyBatchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

module.exports = {
  verifyLogParamSchema,
  verifyBatchQuerySchema
};
