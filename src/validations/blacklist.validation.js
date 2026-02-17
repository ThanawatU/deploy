const { z } = require("zod");

const createBlacklistSchema = z.object({
  userId: z.string().min(10),
  type: z.enum(["DRIVER", "PASSENGER"]),
  reason: z.string().max(200),
  suspendDays: z
        .number({
          required_error: "suspendDays is required",
          invalid_type_error: "suspendDays must be a number"
        })
        .int()
        .min(1)
});

const addEvidenceSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]),
  url: z.string().url()
});

module.exports = {
    createBlacklistSchema,
    addEvidenceSchema
}