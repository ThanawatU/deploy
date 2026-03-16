const exportService = require("../services/export.service");
const { auditLog, getUserFromRequest } = require('../utils/auditLog');

exports.createExportRequest = async (req, res) => {
  try {
    const { logType, format, filters } = req.body;

    const exportRequest = await exportService.createExportRequest({
      requestedById: req.user.id,
      logType,
      format,
      filters
    });

    await auditLog({
      userId: req.user.id,
      ...getUserFromRequest(req),
      action: 'CREATE_EXPORT_REQUEST',
      entity: 'ExportRequest',
      entityId: exportRequest.id,
      req
    });

    /*
    await auditLog({
      ...getUserFromRequest(req),
      action: 'CREATE_EXPORT_REQUEST',
      entity: 'ExportRequest',
      entityId: exportRequest.id,
      req,
      metadata: { logType, format }
    });
    */

    res.status(201).json({
      message: "Export request created successfully",
      data: exportRequest
    });
  } catch (error) {
    console.error("createExportRequest error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create export request"
    });
  }
};

exports.listExportRequests = async (req, res) => {
  try {
    const { page, limit, status, logType } = req.query;

    const result = await exportService.getExportRequests({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      status,
      logType
    });

    // Add Log management

    await auditLog({
      userId: req.user.id, // 🚀 เพิ่มบรรทัดนี้
      ...getUserFromRequest(req),
      action: 'APPROVE_EXPORT_REQUEST',
      entity: 'ExportRequest',
      entityId: id,
      req
    });

    /*
    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_EXPORT_REQUESTS',
      entity: 'ExportRequest',
      req,
      metadata: { recordCount: result.data?.length || 0, status, logType }
    });
    */

    res.json(result);
  } catch (error) {
    console.error("listExportRequests error:", error);
    res.status(500).json({ message: "Failed to fetch export requests" });
  }
};

exports.getExportRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const exportRequest = await exportService.getExportRequestById(id);

    // Add Log management
    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_EXPORT_REQUEST',
      entity: 'ExportRequest',
      entityId: id,
      req
    });

    res.json(exportRequest);
  } catch (error) {
    console.error("getExportRequestById error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch export request"
    });
  }
};

exports.approveExportRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await exportService.approveExportRequest(id, req.user.id);

    await auditLog({
      ...getUserFromRequest(req),
      action: 'APPROVE_EXPORT_REQUEST',
      entity: 'ExportRequest',
      entityId: id,
      req,
      metadata: {
        logType: result.logType,
        format: result.format,
        recordCount: result.recordCount
      }
    });

    res.json({
      message: "Export request approved and processed",
      data: result
    });
  } catch (error) {
    console.error("approveExportRequest error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to approve export request"
    });
  }
};

exports.rejectExportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const result = await exportService.rejectExportRequest(
      id,
      req.user.sub,
      rejectionReason
    );

    await auditLog({
      ...getUserFromRequest(req),
      action: 'REJECT_EXPORT_REQUEST',
      entity: 'ExportRequest',
      entityId: id,
      req,
      metadata: { rejectionReason }
    });

    res.json({
      message: "Export request rejected",
      data: result
    });
  } catch (error) {
    console.error("rejectExportRequest error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to reject export request"
    });
  }
};

exports.downloadExport = async (req, res) => {
  try {
    const { id } = req.params;
    const { filePath, fileName, format } = await exportService.getExportFilePath(id);


    await auditLog({
      ...getUserFromRequest(req),
      action: 'DOWNLOAD_EXPORT',
      entity: 'ExportRequest',
      entityId: id,
      req,
      metadata: { fileName, format }
    });

    res.download(filePath, fileName);
  } catch (error) {
    console.error("downloadExport error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to download export"
    });
  }
};
