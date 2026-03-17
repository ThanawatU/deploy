const { prisma } = require("../utils/prisma");

// เช็คว่า User อยู่ในทริปจริงไหม
const checkUserInTrip = async (userId, routeId) => {
  if (!routeId) return true; // ถ้าไม่มี routeId ถือว่าแจ้งเหตุทั่วไปได้ (เช่น แจ้งแอปพัง/เจออุบัติเหตุข้างทาง)
  const isPassenger = await prisma.booking.findFirst({ where: { routeId, passengerId: userId } });
  const isDriver = await prisma.route.findFirst({ where: { id: routeId, driverId: userId } });
  return !!(isPassenger || isDriver);
};

// ตัวแปร Include กลางสำหรับดึงข้อมูล Incident
const INCIDENT_INCLUDE_OPTIONS = {
  reporter: { select: { id: true, username: true, email: true, firstName: true, lastName: true, phoneNumber: true } },
  route: true,
  evidences: true,
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
  history: { include: { changedBy: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" } },
  route: {
        include: {
          driver: {
            select: { id: true, firstName: true, lastName: true, yellowCardCount: true, driverSuspendedUntil: true
            }
          },
          bookings: {
            include: {
              passenger: {
                select: {id: true, firstName: true, lastName: true, yellowCardCount: true, passengerSuspendedUntil: true
                }
              }
            }
          }
        }
      },
      evidences: true,
        history: {
        include: { changedBy: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      }
};

// 1. สร้าง Incident Report
const createIncidentReport = async (data) => {
  const { reporterId, routeId, category, description, location } = data;

  if (routeId) {
    const isInTrip = await checkUserInTrip(reporterId, routeId);
    if (!isInTrip) throw new Error("คุณไม่ได้อยู่ใน Trip นี้ ไม่สามารถอ้างอิง Trip นี้ได้");
  }

  return prisma.incidentReport.create({
    data: {
      reporterId,
      routeId,
      category,
      description,
      location,
      status: 'PENDING',
      history: {
        create: { toStatus: 'PENDING', changedById: reporterId, note: 'Initial incident report filed' }
      }
    },
    include: { reporter: true }
  });
};

// 2. ดึงรายการ Incident ทั้งหมด
const getIncidentReports = async (where = {}, orderBy = { createdAt: "desc" }) => {
  return prisma.incidentReport.findMany({ 
    where, 
    include: INCIDENT_INCLUDE_OPTIONS, 
    orderBy 
  });
};

// 3. ดึงรายละเอียด Incident รายเคส
const getIncidentReportById = async (id) => {
  return prisma.incidentReport.findUnique({ 
    where: { id }, 
    include: INCIDENT_INCLUDE_OPTIONS 
  });
};

// 4. แอดมินรับเรื่อง (PENDING -> UNDER_INVESTIGATION)
const assignIncidentReport = async (id, adminId) => {
  const incident = await prisma.incidentReport.findUnique({ where: { id } });
  if (!incident) throw new Error("Incident not found");
  if (incident.status !== 'PENDING') throw new Error("เคสนี้ถูกรับเรื่องหรือดำเนินการไปแล้ว");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.incidentReport.update({
      where: { id },
      data: { status: 'UNDER_INVESTIGATION', resolvedById: adminId }
    });

    await tx.incidentStatusHistory.create({
      data: { 
        incidentReportId: id, 
        fromStatus: incident.status, 
        toStatus: 'UNDER_INVESTIGATION', 
        changedById: adminId, 
        note: 'Admin is currently investigating the incident' 
      }
    });

    return updated;
  });
};

// 5. แอดมินจัดการปัญหาเสร็จสิ้น (RESOLVED)
const resolveIncidentReport = async (id, adminId, adminNotes) => {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incidentReport.findUnique({ where: { id } });
    if (!incident) return null;
    if (incident.status === 'RESOLVED') return incident;

    const updated = await tx.incidentReport.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        adminNotes: adminNotes ?? incident.adminNotes,
        resolvedById: adminId,
        resolvedAt: new Date()
      }
    });

    await tx.incidentStatusHistory.create({
      data: {
        incidentReportId: id,
        fromStatus: incident.status,
        toStatus: 'RESOLVED',
        changedById: adminId,
        note: adminNotes || 'Incident resolved'
      }
    });

    // ส่งแจ้งเตือน
    await tx.notification.create({
      data: {
        userId: incident.reporterId,
        type: 'SYSTEM',
        title: 'อัปเดตสถานะการแจ้งเหตุฉุกเฉิน',
        body: `เหตุการณ์ที่คุณแจ้งได้รับการดำเนินการแก้ไขแล้ว\n${adminNotes ? `หมายเหตุ: ${adminNotes}` : ''}`.trim(),
        link: `/incidents/${id}`
      }
    });

    return updated;
  });
};

// 6. แอดมินปฏิเสธเคส (REJECTED)
const rejectIncidentReport = async (id, adminId, adminNotes) => {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incidentReport.findUnique({ where: { id } });
    if (!incident) return null;
    if (incident.status === 'REJECTED') return incident;

    const updated = await tx.incidentReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: adminNotes ?? incident.adminNotes,
        resolvedById: adminId,
        resolvedAt: new Date()
      }
    });

    await tx.incidentStatusHistory.create({
      data: {
        incidentReportId: id,
        fromStatus: incident.status,
        toStatus: 'REJECTED',
        changedById: adminId,
        note: adminNotes || 'Incident rejected'
      }
    });

    await tx.notification.create({
      data: {
        userId: incident.reporterId,
        type: 'SYSTEM',
        title: 'อัปเดตสถานะการแจ้งเหตุฉุกเฉิน',
        body: `การแจ้งเหตุของคุณถูกปฏิเสธ/ยกเลิก\n${adminNotes ? `เหตุผล: ${adminNotes}` : ''}`.trim(),
        link: `/incidents/${id}`
      }
    });

    return updated;
  });
};

// 7. ผู้ใช้ยกเลิกการแจ้งเหตุด้วยตัวเอง
const cancelIncidentReport = async (id, reporterId) => {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incidentReport.findUnique({ where: { id } });
    if (!incident) return null;
    if (incident.reporterId !== reporterId) throw new Error("403: Unauthorized to cancel this incident");
    if (incident.status !== 'PENDING') throw new Error("400: ไม่สามารถยกเลิกเคสได้เนื่องจากแอดมินรับเรื่องแล้ว");

    const updated = await tx.incidentReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: 'ผู้ใช้ทำการยกเลิกการแจ้งเหตุด้วยตนเอง',
        resolvedAt: new Date()
      }
    });

    await tx.incidentStatusHistory.create({
      data: {
        incidentReportId: id,
        fromStatus: incident.status,
        toStatus: 'REJECTED',
        changedById: reporterId,
        note: 'User manually cancelled the incident report'
      }
    });

    return updated;
  });
};

// 8. แนบรูปถ่ายสถานที่เกิดเหตุ/หลักฐานเพิ่มเติม
const addEvidencesToIncidentReport = async (incidentId, evidencesData) => {
  const incident = await prisma.incidentReport.findUnique({ where: { id: incidentId } });
  
  if (!incident) throw new Error("ไม่พบ Incident");
  if (['RESOLVED', 'REJECTED'].includes(incident.status)) {
    throw new Error("ไม่สามารถเพิ่มหลักฐานได้เนื่องจากเคสนี้ถูกดำเนินการไปแล้ว");
  }

  const formattedData = evidencesData.map(ev => ({
    incidentReportId: incidentId,
    type: ev.type,
    url: ev.url,
    fileName: ev.fileName
  }));

  await prisma.incidentEvidence.createMany({ data: formattedData });
  return getIncidentReportById(incidentId);
};

module.exports = {
  createIncidentReport,
  getIncidentReports,
  getIncidentReportById,
  assignIncidentReport,
  resolveIncidentReport,
  rejectIncidentReport,
  cancelIncidentReport,
  addEvidencesToIncidentReport
};