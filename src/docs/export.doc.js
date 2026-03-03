/**
 * @swagger
 * tags:
 *   name: Exports
 *   description: Log export management endpoints (Admin only)
 */

/**
 * @swagger
 * /api/exports:
 *   post:
 *     summary: Create a new export request
 *     description: สร้างคำขอ export ข้อมูล log (AuditLog, SystemLog, AccessLog) ในรูปแบบ CSV, JSON หรือ PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [logType]
 *             properties:
 *               logType:
 *                 type: string
 *                 enum: [AuditLog, SystemLog, AccessLog]
 *                 example: AuditLog
 *               format:
 *                 type: string
 *                 enum: [CSV, JSON, PDF]
 *                 default: CSV
 *                 example: CSV
 *               filters:
 *                 type: object
 *                 properties:
 *                   dateFrom:
 *                     type: string
 *                     example: "2026-01-01"
 *                   dateTo:
 *                     type: string
 *                     example: "2026-02-27"
 *                   level:
 *                     type: string
 *                     example: ERROR
 *                   action:
 *                     type: string
 *                     example: CREATE_USER
 *                   userId:
 *                     type: string
 *     responses:
 *       201:
 *         description: Export request created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/exports:
 *   get:
 *     summary: List all export requests
 *     description: ดูรายการคำขอ export ทั้งหมด พร้อม pagination และ filter
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED, FAILED] }
 *       - in: query
 *         name: logType
 *         schema: { type: string, enum: [AuditLog, SystemLog, AccessLog] }
 *     responses:
 *       200:
 *         description: Export requests retrieved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/exports/{id}:
 *   get:
 *     summary: Get export request by ID
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Export request retrieved successfully
 *       404:
 *         description: Export request not found
 */

/**
 * @swagger
 * /api/exports/{id}/approve:
 *   patch:
 *     summary: Approve an export request
 *     description: อนุมัติคำขอ export และเริ่มสร้างไฟล์ทันที
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Export request approved and file generated
 *       400:
 *         description: Cannot approve (not PENDING status)
 *       404:
 *         description: Export request not found
 */

/**
 * @swagger
 * /api/exports/{id}/reject:
 *   patch:
 *     summary: Reject an export request
 *     description: ปฏิเสธคำขอ export พร้อมระบุเหตุผล
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: "ข้อมูลไม่อยู่ในขอบเขตที่อนุญาต"
 *     responses:
 *       200:
 *         description: Export request rejected
 *       400:
 *         description: Cannot reject (not PENDING status)
 *       404:
 *         description: Export request not found
 */

/**
 * @swagger
 * /api/exports/{id}/download:
 *   get:
 *     summary: Download export file
 *     description: ดาวน์โหลดไฟล์ export ที่สร้างเสร็จแล้ว (สถานะ COMPLETED)
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           text/csv: {}
 *           application/json: {}
 *           application/pdf: {}
 *       400:
 *         description: Export not ready for download
 *       404:
 *         description: Export request or file not found
 */
