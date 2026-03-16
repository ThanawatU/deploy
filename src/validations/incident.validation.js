const { z } = require("zod");

// 1. ตรวจสอบข้อมูลตอนผู้ใช้แจ้งเหตุ
const createIncidentSchema = z.object({
  routeId: z.string().optional().nullable(),
  category: z.enum([
    "ACCIDENT", "VEHICLE_BREAKDOWN", "MEDICAL_EMERGENCY", 
    "NATURAL_DISASTER", "CRIME_INCIDENT", "OTHER"
  ]),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string().optional().nullable(),
    address: z.string().optional().nullable()
  }).optional().nullable(),
});

// 2. ตรวจสอบข้อมูลตอนแอดมินตัดสินเคส
const adminIncidentDecisionSchema = z.object({
  adminNotes: z.string().max(1000).optional().nullable()
});

// 3. ตรวจสอบการอัปโหลดหลักฐาน
const addIncidentEvidenceSchema = z.object({
  evidences: z.array(
    z.object({
      type: z.enum(["VIDEO", "IMAGE", "AUDIO", "DOCUMENT"], {
        errorMap: () => ({ message: "Invalid evidence type" })
      }),
      url: z.string().url("Must be a valid URL"),
      fileName: z.string().optional().nullable()
    })
  )
  .min(1, "At least one evidence is required")
  .max(6, "Total files cannot exceed 6")
});

module.exports = {
  createIncidentSchema,
  adminIncidentDecisionSchema,
  addIncidentEvidenceSchema
};