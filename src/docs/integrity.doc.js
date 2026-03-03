/**
 * @swagger
 * tags:
 *   name: Integrity
 *   description: Audit log integrity verification endpoints (Admin only)
 */

/**
 * @swagger
 * /api/integrity/verify:
 *   get:
 *     summary: Batch verify audit log integrity
 *     description: ตรวจสอบ integrity ของ AuditLog records แบบ batch พร้อม pagination และ date filter
 *     tags: [Integrity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: startDate
 *         schema: { type: string }
 *         description: "วันที่เริ่มต้น (YYYY-MM-DD)"
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         schema: { type: string }
 *         description: "วันที่สิ้นสุด (YYYY-MM-DD)"
 *         example: "2026-02-28"
 *     responses:
 *       200:
 *         description: Batch integrity verification completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Batch integrity verification completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         checked:
 *                           type: integer
 *                         valid:
 *                           type: integer
 *                         invalid:
 *                           type: integer
 *                         missingHash:
 *                           type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           action:
 *                             type: string
 *                           entity:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           isValid:
 *                             type: boolean
 *                           reason:
 *                             type: string
 *                             enum: [MISSING_HASH, HASH_MISMATCH]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/integrity/verify/{id}:
 *   get:
 *     summary: Verify single audit log integrity
 *     description: ตรวจสอบ integrity ของ AuditLog record เดียวโดย ID
 *     tags: [Integrity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: AuditLog record ID
 *     responses:
 *       200:
 *         description: Integrity verification completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Integrity verification completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     action:
 *                       type: string
 *                     entity:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     integrityHash:
 *                       type: string
 *                     isValid:
 *                       type: boolean
 *                     expectedHash:
 *                       type: string
 *                       description: Only present when isValid is false
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Audit log not found
 */
