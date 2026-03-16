const { z } = require("zod");

// 1. ตรวจสอบข้อมูลตอนผู้ใช้สร้าง Report (รองรับหลายคน)
const createReportSchema = z.object({
  reportedUserIds: z.array(z.string()).min(1, "Please select at least one user to report"),
  bookingId: z.string().optional().nullable(),
  routeId: z.string({ required_error: "Trip (routeId) is required" }).min(1, "Trip (routeId) cannot be empty"),
  category: z.enum([
    "DANGEROUS_DRIVING", 
    "AGGRESSIVE_BEHAVIOR", 
    "HARASSMENT", 
    "NO_SHOW", 
    "FRAUD_OR_SCAM", 
    "OTHER"
  ]),
  description: z.string().min(10, "Description must be at least 10 characters long")
});

// 2. ตรวจสอบข้อมูลตอนแอดมินอัปเดตสถานะ Report
const adminDecisionSchema = z.object({
  adminNotes: z.string().max(1000).optional().nullable()
});

// 3. ตรวจสอบการอัปโหลดหลักฐาน
const addReportEvidenceSchema = z.object({
  evidences: z.array(
    z.object({
      type: z.enum(["VIDEO", "IMAGE", "AUDIO", "DOCUMENT"], {
        errorMap: () => ({ message: "Invalid evidence type" })
      }),
      url: z.string().url("Must be a valid URL"),
      fileName: z.string().optional().nullable(),
      mimeType: z.string().optional().nullable(),
      fileSize: z.number().int().positive().optional().nullable()
    })
  )
  .min(1, "At least one evidence is required")
  .max(6, "Total files cannot exceed 6") 
  .refine((items) => {
    const imageCount = items.filter(item => item.type === "IMAGE").length;
    const videoCount = items.filter(item => item.type === "VIDEO").length;
    
    return imageCount <= 3 && videoCount <= 3;
  }, { 
    message: "You can upload a maximum of 3 images and 3 videos per request." 
  })
});

module.exports = {
  createReportSchema,
  adminDecisionSchema,
  addReportEvidenceSchema
};