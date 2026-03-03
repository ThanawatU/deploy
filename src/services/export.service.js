const fs = require('fs');
const path = require('path');
const { prisma } = require("../utils/prisma");
const { getNow } = require("../utils/timestamp");
const { generateCSV, generateJSON, generatePDF } = require("../utils/exportGenerators");
const { logger } = require("../utils/logger");
const ApiError = require("../utils/ApiError");

const EXPORTS_DIR = path.join(__dirname, '../../exports');

/** ตรวจสอบและสร้างโฟลเดอร์ exports ถ้ายังไม่มี */
const ensureExportsDir = () => {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
};

/** Prisma model map ตาม logType */
const MODEL_MAP = {
  AuditLog: 'auditLog',
  SystemLog: 'systemLog',
  AccessLog: 'accessLog'
};

/**
 * สร้าง export request ใหม่ (สถานะ PENDING)
 */
const createExportRequest = async ({ requestedById, logType, format, filters }) => {
  const exportRequest = await prisma.exportRequest.create({
    data: {
      requestedById,
      logType,
      format,
      filters: filters || undefined,
      status: 'PENDING',
      createdAt: getNow()
    }
  });

  return exportRequest;
};

/**
 * ดึงรายการ export requests พร้อม pagination
 */
const getExportRequests = async ({ page = 1, limit = 20, status, logType }) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (logType) {
    where.logType = logType;
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.exportRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        requestedBy: {
          select: { id: true, username: true, email: true }
        },
        reviewedBy: {
          select: { id: true, username: true, email: true }
        }
      }
    }),
    prisma.exportRequest.count({ where })
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * ดึง export request ตาม ID
 */
const getExportRequestById = async (id) => {
  const exportRequest = await prisma.exportRequest.findUnique({
    where: { id },
    include: {
      requestedBy: {
        select: { id: true, username: true, email: true }
      },
      reviewedBy: {
        select: { id: true, username: true, email: true }
      }
    }
  });

  if (!exportRequest) {
    throw new ApiError(404, 'Export request not found');
  }

  return exportRequest;
};

/**
 * อนุมัติ export request แล้วเริ่มสร้างไฟล์
 */
const approveExportRequest = async (id, reviewedById) => {
  const exportRequest = await prisma.exportRequest.findUnique({
    where: { id }
  });

  if (!exportRequest) {
    throw new ApiError(404, 'Export request not found');
  }

  if (exportRequest.status !== 'PENDING') {
    throw new ApiError(400, `Cannot approve export request with status: ${exportRequest.status}`);
  }

  await prisma.exportRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedById,
      reviewedAt: getNow()
    }
  });

  // สร้างไฟล์ export (synchronous flow)
  const result = await processExport(id);
  return result;
};

/**
 * ปฏิเสธ export request
 */
const rejectExportRequest = async (id, reviewedById, rejectionReason) => {
  const exportRequest = await prisma.exportRequest.findUnique({
    where: { id }
  });

  if (!exportRequest) {
    throw new ApiError(404, 'Export request not found');
  }

  if (exportRequest.status !== 'PENDING') {
    throw new ApiError(400, `Cannot reject export request with status: ${exportRequest.status}`);
  }

  const updated = await prisma.exportRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedById,
      reviewedAt: getNow(),
      rejectionReason
    }
  });

  return updated;
};

/**
 * สร้างไฟล์ export จากข้อมูล log
 * ขั้นตอน: PROCESSING → query data → generate file → COMPLETED / FAILED
 */
const processExport = async (exportRequestId) => {
  // อัพเดทสถานะเป็น PROCESSING
  await prisma.exportRequest.update({
    where: { id: exportRequestId },
    data: { status: 'PROCESSING' }
  });

  try {
    const exportRequest = await prisma.exportRequest.findUnique({
      where: { id: exportRequestId }
    });

    // สร้าง where clause จาก filters
    const where = buildWhereClause(exportRequest.logType, exportRequest.filters);

    // Query ข้อมูลจาก model ที่ตรงกับ logType
    const modelName = MODEL_MAP[exportRequest.logType];
    const records = await prisma[modelName].findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // สร้างไฟล์
    ensureExportsDir();

    const ext = exportRequest.format.toLowerCase();
    const fileName = `${exportRequest.logType}_${exportRequestId}_${Date.now()}.${ext}`;
    const filePath = path.join(EXPORTS_DIR, fileName);

    let result;
    switch (exportRequest.format) {
      case 'CSV':
        result = await generateCSV(records, exportRequest.logType, filePath);
        break;
      case 'JSON':
        result = await generateJSON(records, exportRequest.logType, filePath);
        break;
      case 'PDF':
        result = await generatePDF(records, exportRequest.logType, filePath);
        break;
      default:
        throw new Error(`Unsupported format: ${exportRequest.format}`);
    }

    // อัพเดทสถานะเป็น COMPLETED
    const now = getNow();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 วัน

    const updated = await prisma.exportRequest.update({
      where: { id: exportRequestId },
      data: {
        status: 'COMPLETED',
        filePath: fileName,
        fileSize: result.fileSize,
        recordCount: result.recordCount,
        completedAt: now,
        expiresAt
      },
      include: {
        requestedBy: {
          select: { id: true, username: true, email: true }
        },
        reviewedBy: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    return updated;
  } catch (error) {
    logger.error('Export processing failed', {
      exportRequestId,
      error: error.message
    });

    await prisma.exportRequest.update({
      where: { id: exportRequestId },
      data: { status: 'FAILED' }
    });

    throw new ApiError(500, 'Export processing failed');
  }
};

/**
 * สร้าง where clause จาก filters ของ export request
 */
const buildWhereClause = (logType, filters) => {
  const where = {};

  if (!filters) return where;

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(`${filters.dateFrom}T00:00:00.000+07:00`);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(`${filters.dateTo}T23:59:59.999+07:00`);
    }
  }

  // Log-type-specific filters
  if (logType === 'SystemLog' && filters.level) {
    where.level = filters.level;
  }

  if (logType === 'AuditLog' && filters.action) {
    where.action = filters.action;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  return where;
};

/**
 * ดึง file path ของ export ที่สำเร็จแล้ว (สำหรับ download)
 */
const getExportFilePath = async (id) => {
  const exportRequest = await prisma.exportRequest.findUnique({
    where: { id }
  });

  if (!exportRequest) {
    throw new ApiError(404, 'Export request not found');
  }

  if (exportRequest.status !== 'COMPLETED') {
    throw new ApiError(400, `Export is not ready for download. Current status: ${exportRequest.status}`);
  }

  const fullPath = path.join(EXPORTS_DIR, exportRequest.filePath);

  if (!fs.existsSync(fullPath)) {
    throw new ApiError(404, 'Export file not found on disk. It may have expired.');
  }

  return {
    filePath: fullPath,
    fileName: exportRequest.filePath,
    format: exportRequest.format
  };
};

/**
 * ลบไฟล์ export ที่หมดอายุ
 */
const deleteExpiredExports = async () => {
  try {
    const now = getNow();

    const expiredExports = await prisma.exportRequest.findMany({
      where: {
        status: 'COMPLETED',
        expiresAt: { lt: now }
      }
    });

    let deletedFiles = 0;

    for (const exportReq of expiredExports) {
      // ลบไฟล์จาก disk
      if (exportReq.filePath) {
        const fullPath = path.join(EXPORTS_DIR, exportReq.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          deletedFiles++;
        }
      }
    }

    // อัพเดทสถานะ
    if (expiredExports.length > 0) {
      await prisma.exportRequest.updateMany({
        where: {
          id: { in: expiredExports.map(e => e.id) }
        },
        data: {
          status: 'FAILED',
          filePath: null
        }
      });
    }

    logger.info('Expired exports cleanup finished', {
      checked: expiredExports.length,
      deletedFiles
    });
  } catch (error) {
    logger.error('Expired exports cleanup failed', { error: error.message });
  }
};

module.exports = {
  createExportRequest,
  getExportRequests,
  getExportRequestById,
  approveExportRequest,
  rejectExportRequest,
  getExportFilePath,
  deleteExpiredExports
};
