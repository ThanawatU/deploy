const incidentService = require('../services/incident.service');
const { auditLog, getUserFromRequest } = require('../utils/auditLog');

// 1. สร้างการแจ้งเหตุ (Incident)
exports.createIncident = async (req, res) => {
  try {
    const { routeId, category, description, location } = req.body;
    const reporterId = req.user.id;

    const incident = await incidentService.createIncidentReport({
      reporterId,
      routeId,
      category,
      description,
      location
    });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'CREATE_INCIDENT',
      entity: 'IncidentReport',
      entityId: incident.id,
      req,
      metadata: { category, hasLocation: !!location }
    });

    res.status(201).json({ success: true, message: "Incident reported successfully", data: incident });
  } catch (error) {
    console.error(error);
    const statusCode = error.message.includes("Trip") ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message || "Failed to report incident" });
  }
};

// 2. ดึงรายการ Incident ทั้งหมด
exports.getIncidents = async (req, res) => {
  try {
    const { status, category, q, routeId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (routeId) where.routeId = routeId;
    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { reporter: { username: { contains: q, mode: "insensitive" } } }
      ];
    }

    const records = await incidentService.getIncidentReports(where);
    
    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_INCIDENTS',
      entity: 'IncidentReport',
      req,
      metadata: { filters: { status, category, routeId, searchQuery: q } }
    });
    
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch incident reports" });
  }
};

// 3. ดึงรายละเอียด Incident รายเคส
exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await incidentService.getIncidentReportById(id);

    if (!incident) return res.status(404).json({ message: "Incident not found" });

    // เช็คสิทธิ์การเข้าดู
    if (req.user.role !== 'ADMIN' && req.user.id !== incident.reporterId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_INCIDENT',
      entity: 'IncidentReport',
      entityId: id,
      req
    });

    res.json(incident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch incident details" });
  }
};

// 4. แอดมินรับเรื่อง (PENDING -> UNDER_INVESTIGATION)
exports.assignIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await incidentService.assignIncidentReport(id, req.user.id);

    await auditLog({
      ...getUserFromRequest(req),
      action: 'ASSIGN_INCIDENT',
      entity: 'IncidentReport',
      entityId: id,
      req
    });

    res.json({ success: true, message: "Incident assigned to investigate", data: updated });
  } catch (error) {
    console.error(error);
    const statusCode = error.message.includes("รับเรื่อง") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Failed to assign incident' });
  }
};

// 5. แอดมินจัดการเสร็จสิ้น (RESOLVED)
exports.resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const result = await incidentService.resolveIncidentReport(id, req.user.id, adminNotes);
    if (!result) return res.status(404).json({ message: "Incident not found" });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'RESOLVE_INCIDENT',
      entity: 'IncidentReport',
      entityId: id,
      req,
      metadata: { adminNotes }
    });

    res.json({ success: true, message: "Incident resolved", data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to resolve incident" });
  }
};

// 6. แอดมินปฏิเสธเคส (REJECTED)
exports.rejectIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const result = await incidentService.rejectIncidentReport(id, req.user.id, adminNotes);
    if (!result) return res.status(404).json({ message: "Incident not found" });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'REJECT_INCIDENT',
      entity: 'IncidentReport',
      entityId: id,
      req,
      metadata: { adminNotes }
    });

    res.json({ success: true, message: "Incident rejected", data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reject incident" });
  }
};

// 7. ผู้ใช้ยกเลิกการแจ้งเหตุด้วยตัวเอง
exports.cancelIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await incidentService.cancelIncidentReport(id, req.user.id);

    if (!result) return res.status(404).json({ message: "Incident not found" });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'CANCEL_INCIDENT',
      entity: 'IncidentReport',
      entityId: id,
      req
    });

    res.json({ success: true, message: "Incident has been cancelled", data: result });
  } catch (error) {
    console.error(error);
    const statusCode = error.message.includes("403") || error.message.includes("400") ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message || "Failed to cancel incident" });
  }
};

// 8. เพิ่มหลักฐานสถานที่เกิดเหตุ
exports.addEvidence = async (req, res) => {
  try {
    const { id } = req.params; 
    const { evidences } = req.body;

    const result = await incidentService.addEvidencesToIncidentReport(id, evidences);

    await auditLog({
      ...getUserFromRequest(req),
      action: 'ADD_INCIDENT_EVIDENCE',
      entity: 'IncidentReport',
      entityId: id,
      req,
      metadata: { evidenceCount: evidences.length }
    });

    res.status(201).json({ success: true, message: "Evidence uploaded successfully", data: result });
  } catch (error) {
    console.error("Error Detail:", error);
    const statusCode = error.message.includes("ดำเนินการไปแล้ว") ? 403 : 500;
    res.status(statusCode).json({ success: false, message: error.message || "Failed to add evidences" });
  }
};

// 9. ดึงประวัติการแจ้งเหตุของตัวเอง
exports.getMyIncidents = async (req, res) => {
  try {
    const records = await incidentService.getIncidentReports({ reporterId: req.user.id });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_MY_INCIDENTS',
      entity: 'IncidentReport',
      req,
      metadata: { recordCount: records.length }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch your incident reports" });
  }
};