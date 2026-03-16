const { prisma } = require("../utils/prisma");
const crypto = require('crypto');


// ตรวจสอบว่าผู้ใช้อยู่ในทริปนั้นจริงหรือไม่
const checkUserInTrip = async (userId, routeId) => {
  const isPassenger = await prisma.booking.findFirst({ where: { routeId, passengerId: userId } });
  const isDriver = await prisma.route.findFirst({ where: { id: routeId, driverId: userId } });
  return !!(isPassenger || isDriver);
};

// จัดการระบบใบเหลืองและแบน
const handleYellowCard = async (tx, userId) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  let currentCards = user.yellowCardCount || 0;

  if (!user.yellowCardExpiresAt || user.yellowCardExpiresAt < now) {
    currentCards = 0; // รีเซ็ตถ้าหมดอายุ
  }

  currentCards += 1;

  if (currentCards >= 3) {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + 30); // แบน 30 วัน
    await tx.user.update({
      where: { id: userId },
      data: {
        yellowCardCount: 0,
        yellowCardExpiresAt: null,
        ...(user.role === 'DRIVER' ? { driverSuspendedUntil: suspendUntil } : { passengerSuspendedUntil: suspendUntil })
      }
    });
  } else {
    const newWindow = new Date();
    newWindow.setDate(newWindow.getDate() + 30); // ยืดอายุไปอีก 30 วัน
    await tx.user.update({
      where: { id: userId },
      data: { yellowCardCount: currentCards, yellowCardExpiresAt: newWindow }
    });
  }
};

// 1. สร้าง Report
const createReportCase = async (data) => {
  const { reporterId, reportedUserIds, bookingId, routeId, category, description } = data;

  if (!routeId) throw new Error("จำเป็นต้องระบุ Trip (routeId) เพื่อทำการ Report");

  const isInTrip = await checkUserInTrip(reporterId, routeId);
  if (!isInTrip) throw new Error("คุณไม่สามารถ Report ได้เนื่องจากคุณไม่ได้อยู่ใน Trip นี้");

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  const isDriver = route && route.driverId === reporterId;

  if (isDriver) {
    const existingReports = await prisma.reportCase.findMany({
      where: {
        reporterId,
        routeId,
        reportedUserId: { in: reportedUserIds }
      }
    });

    if (existingReports.length > 0) {
      throw new Error("คุณได้ทำการ Report ผู้ใช้รายนี้ใน Trip นี้ไปแล้ว");
    }
  } else {
    const existingReport = await prisma.reportCase.findFirst({ 
      where: { reporterId, routeId } 
    });

    if (existingReport) {
      throw new Error("คุณได้ทำการ Report สำหรับ Trip นี้ไปแล้ว (จำกัด 1 ครั้งต่อ 1 Trip)");
    }
  }

  const generatedGroupId = reportedUserIds.length > 1 ? `REP-${crypto.randomBytes(4).toString('hex')}` : null;

  const createPromises = reportedUserIds.map((targetUserId) => {
    return prisma.reportCase.create({
      data: {
        groupId: generatedGroupId,
        reporterId,
        reportedUserId: targetUserId,
        bookingId,
        routeId,
        category,
        description,
        status: 'PENDING',
        statusHistory: {
          create: { toStatus: 'PENDING', changedById: reporterId, note: 'Initial report filed' }
        }
      },
      include: { reporter: true, reportedUser: true }
    });
  });

  return {
    groupId: generatedGroupId,
    cases: await prisma.$transaction(createPromises)
  };
};

// 2. ดึงรายการ Report ทั้งหมด
const getReports = async (where = {}) => {
  return prisma.reportCase.findMany({
    where,
    include: {
      reporter: {
        select: { id: true, username: true, firstName: true, lastName: true, role: true }
      },
      reportedUser: {
        select: { id: true, username: true, firstName: true, lastName: true, role: true, yellowCardCount: true }
      },
      route: {
        select: { id: true, driverId: true, startLocation: true, endLocation: true, departureTime: true } 
      },
      evidences: true,
      statusHistory: {
        include: { changedBy: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// 3. ดึง Report เคสเดี่ยว (ใช้ Report ID)
const getReportById = async (id) => {
  return prisma.reportCase.findUnique({ where: { id }, include: {
      reporter: {
        select: { id: true, username: true, firstName: true, lastName: true }
      },
      reportedUser: {
        select: { id: true, username: true, firstName: true, lastName: true, yellowCardCount: true }
      },
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
      statusHistory: {
        include: { changedBy: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
};

// 4. ดึง Report แบบกลุ่ม (ใช้ Group ID)
const getReportByGroupId = async (groupId) => {
  return prisma.reportCase.findMany({ where: { groupId }, include: {
      reporter: {
        select: { id: true, username: true, firstName: true, lastName: true }
      },
      reportedUser: {
        select: { id: true, username: true, firstName: true, lastName: true, yellowCardCount: true }
      },
      route: {
        select: { id: true, driverId: true, startLocation: true, endLocation: true, departureTime: true } 
      },
      evidences: true,
      statusHistory: {
        include: { changedBy: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// 5. แอดมินรับเรื่อง (PENDING -> UNDER_REVIEW)
const assignReport = async (ids, adminId) => {
  const cases = await prisma.reportCase.findMany({ where: { id: { in: ids } } });
  if (!cases.length) throw new Error("Report not found");

  return prisma.$transaction(async (tx) => {
    const updated = [];
    for (const rep of cases) {
      if (rep.status !== 'PENDING') continue;

      const res = await tx.reportCase.update({
        where: { id: rep.id },
        data: { status: 'UNDER_REVIEW', resolvedById: adminId }
      });
      await tx.reportCaseStatusHistory.create({
        data: { reportCaseId: rep.id, fromStatus: rep.status, toStatus: 'UNDER_REVIEW', changedById: adminId, note: 'Admin picked up the case' }
      });
      updated.push(res);
    }
    return updated;
  });
};

// 6. แอดมินตัดสินใจ: อนุมัติเคส (RESOLVED) + แจกใบเหลือง
const resolveReport = async (id, adminId, adminNotes) => {
  return prisma.$transaction(async (tx) => {
    const isGroup = id.startsWith('REP-');
    const casesToUpdate = isGroup 
      ? await tx.reportCase.findMany({ where: { groupId: id } })
      : [await tx.reportCase.findUnique({ where: { id } })].filter(Boolean);

    if (!casesToUpdate.length) return null;

    const updatedCases = [];
    let notificationSent = false;

    for (const currentReport of casesToUpdate) {
      if (currentReport.status === 'RESOLVED') continue;
      
      const updatedReport = await tx.reportCase.update({ 
        where: { id: currentReport.id }, 
        data: { 
          status: 'RESOLVED', 
          adminNotes: adminNotes ?? currentReport.adminNotes,
          resolvedById: adminId,
          resolvedAt: new Date(),
          closedAt: new Date() // ปิดเคสเลย
        } 
      });

      await tx.reportCaseStatusHistory.create({
        data: {
          reportCaseId: currentReport.id,
          fromStatus: currentReport.status, 
          toStatus: 'RESOLVED',
          changedById: adminId,
          note: adminNotes || 'Admin resolved the report'
        }
      });

      // จัดการแจกใบเหลือง/แบนผู้กระทำผิด
      await handleYellowCard(tx, currentReport.reportedUserId);
      updatedCases.push(updatedReport);
    }

    if (updatedCases.length > 0 && !notificationSent) {
      await tx.notification.create({
        data: { 
          userId: updatedCases[0].reporterId, 
          type: 'SYSTEM', 
          title: 'ผลการดำเนินการรายงานของคุณ', 
          body: `เคสของคุณได้รับการอนุมัติแล้ว\n${adminNotes ? `เหตุผล: ${adminNotes}` : ''}`.trim(), 
          link: `/reports/${updatedCases[0].groupId || updatedCases[0].id}` 
        }
      });
      notificationSent = true;
    }
    return updatedCases;
  });
};

// 7. แอดมินตัดสินใจ: ปฏิเสธเคส (REJECTED)
const rejectReport = async (id, adminId, adminNotes) => {
  return prisma.$transaction(async (tx) => {
    const isGroup = id.startsWith('REP-');
    const casesToUpdate = isGroup 
      ? await tx.reportCase.findMany({ where: { groupId: id } })
      : [await tx.reportCase.findUnique({ where: { id } })].filter(Boolean);

    if (!casesToUpdate.length) return null;

    const updatedCases = [];
    let notificationSent = false;

    for (const currentReport of casesToUpdate) {
      if (currentReport.status === 'REJECTED') continue;
      
      const updatedReport = await tx.reportCase.update({ 
        where: { id: currentReport.id }, 
        data: { 
          status: 'REJECTED', 
          adminNotes: adminNotes ?? currentReport.adminNotes,
          resolvedById: adminId,
          resolvedAt: new Date(),
          closedAt: new Date()
        } 
      });

      await tx.reportCaseStatusHistory.create({
        data: {
          reportCaseId: currentReport.id,
          fromStatus: currentReport.status, 
          toStatus: 'REJECTED',
          changedById: adminId,
          note: adminNotes || 'Admin rejected the report'
        }
      });

      updatedCases.push(updatedReport);
    }

    if (updatedCases.length > 0 && !notificationSent) {
      await tx.notification.create({
        data: { 
          userId: updatedCases[0].reporterId, 
          type: 'SYSTEM', 
          title: 'ผลการดำเนินการรายงานของคุณ', 
          body: `เคสของคุณถูกปฏิเสธ\n${adminNotes ? `เหตุผล: ${adminNotes}` : 'หากต้องการข้อมูลเพิ่มเติม กรุณาติดต่อฝ่ายสนับสนุน'}`.trim(), 
          link: `/reports/${updatedCases[0].groupId || updatedCases[0].id}` 
        }
      });
      notificationSent = true;
    }
    return updatedCases;
  });
};

// 8. แนบหลักฐานเคสเดี่ยว + บันทึก Timestamp
const addEvidencesToReport = async (reportId, evidencesData, uploadedById) => {
  const report = await prisma.reportCase.findUnique({ where: { id: reportId } });
  
  if (!report) throw new Error("ไม่พบ Report");
  if (['RESOLVED', 'REJECTED'].includes(report.status)) {
    throw new Error("ไม่สามารถเพิ่มหลักฐานได้เนื่องจาก Report นี้ถูกดำเนินการไปแล้ว");
  }

  const formattedData = evidencesData.map(ev => ({
    reportCaseId: reportId, 
    type: ev.type, 
    url: ev.url, 
    fileName: ev.fileName, 
    mimeType: ev.mimeType, 
    fileSize: ev.fileSize, 
    uploadedById
  }));

  // สร้างหลักฐาน และประทับเวลา lastEvidenceAddedAt
  await prisma.$transaction([
    prisma.reportEvidence.createMany({ data: formattedData }),
    prisma.reportCase.update({
      where: { id: reportId },
      data: { lastEvidenceAddedAt: new Date() } // อัปเดตเวลาล่าสุดที่มีการเพิ่มหลักฐาน
    })
  ]);

  return getReportById(reportId);
};

// 9. แนบหลักฐานแบบกลุ่ม + บันทึก Timestamp
const addEvidencesToReportGroup = async (groupId, evidencesData, uploadedById) => {
  const casesInGroup = await prisma.reportCase.findMany({ where: { groupId } });
  
  if (!casesInGroup.length) throw new Error("Report group not found");
  if (['RESOLVED', 'REJECTED'].includes(casesInGroup[0].status)) {
    throw new Error("ไม่สามารถเพิ่มหลักฐานได้เนื่องจาก Report นี้ถูกดำเนินการไปแล้ว");
  }

  const formattedData = [];
  const caseIds = [];
  
  casesInGroup.forEach(reportCase => {
    caseIds.push(reportCase.id);
    evidencesData.forEach(ev => {
      formattedData.push({ 
        reportCaseId: reportCase.id, 
        type: ev.type, 
        url: ev.url, 
        fileName: ev.fileName, 
        mimeType: ev.mimeType, 
        fileSize: ev.fileSize, 
        uploadedById 
      });
    });
  });

  // สร้างหลักฐาน และประทับเวลา lastEvidenceAddedAt ให้ทุกเคสใน Group
  await prisma.$transaction([
    prisma.reportEvidence.createMany({ data: formattedData }),
    prisma.reportCase.updateMany({
      where: { id: { in: caseIds } },
      data: { lastEvidenceAddedAt: new Date() } // อัปเดตเวลาล่าสุดที่มีการเพิ่มหลักฐาน
    })
  ]);

  return getReportByGroupId(groupId);
};
 // ผู้ใช้ยกเลิกการรายงาน
const cancelReport = async (id, reporterId) => {
  const report = await prisma.reportCase.findUnique({ where: { id } });
  if (!report || report.reporterId !== reporterId) throw new Error("Unauthorized");
  if (report.status !== 'PENDING') throw new Error("ไม่สามารถยกเลิกได้เพราะแอดมินรับเรื่องไปแล้ว");

  return prisma.reportCase.update({
    where: { id },
    data: { status: 'REJECTED', adminNotes: 'ผู้ใช้ยกเลิกการรายงานด้วยตัวเอง' }
  });
};

module.exports = {
  createReportCase,
  getReports,
  getReportById,
  getReportByGroupId,
  assignReport,
  resolveReport,
  rejectReport,
  addEvidencesToReport,
  addEvidencesToReportGroup,
  cancelReport
};