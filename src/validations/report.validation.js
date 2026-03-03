const { z } = require("zod");

// 1. ตรวจสอบข้อมูลตอนผู้ใช้สร้าง Report (รองรับหลายคน)
const createReportSchema = z.object({
  // รับเป็น Array ของ ID คนที่ถูกรีพอร์ต (Checkbox)
  reportedUserIds: z.array(z.string()).min(1, "Please select at least one user to report"),
  bookingId: z.string().optional().nullable(),
  routeId: z.string().optional().nullable(),
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
const updateReportStatusSchema = z.object({
  status: z.enum([
    "FILED",
    "UNDER_REVIEW",
    "INVESTIGATING",
    "RESOLVED",
    "REJECTED",
    "CLOSED"
  ], {
    errorMap: () => ({ message: "Invalid report status" })
  }),
  adminNotes: z.string().max(1000).optional().nullable(),
  note: z.string().max(500).optional().nullable()
});

// 3. ตรวจสอบการอัปโหลดหลักฐาน (กฎ: รูป 3 + วิดีโอ 3)
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
    // นับจำนวนรายประเภท
    const imageCount = items.filter(item => item.type === "IMAGE").length;
    const videoCount = items.filter(item => item.type === "VIDEO").length;
    
    // กฎ: รูปไม่เกิน 3 และ วิดีโอไม่เกิน 3
    return imageCount <= 3 && videoCount <= 3;
  }, { 
    message: "You can upload a maximum of 3 images and 3 videos per request." 
  })
});

module.exports = {
  createReportSchema,
  updateReportStatusSchema,
  addReportEvidenceSchema
};