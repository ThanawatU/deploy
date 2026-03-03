const { prisma } = require("../utils/prisma");
const crypto = require('crypto'); // ใช้สำหรับสร้างรหัสกลุ่ม

// สร้าง Report ใหม่ และบันทึกประวัติสถานะแรก (FILED)
const createReportCase = async (data) => {
  const { reporterId, reportedUserIds, bookingId, routeId, category, description } = data;

  const generatedGroupId = reportedUserIds.length > 1 
    ? `REP-${crypto.randomBytes(4).toString('hex')}` 
    : null;

  const createPromises = reportedUserIds.map((targetUserId) => {
    return prisma.reportCase.create({
      data: {
        groupId: generatedGroupId,
        reporterId,
        driverId: targetUserId,
        bookingId,
        routeId,
        category,
        description,
        status: 'FILED',
        statusHistory: {
          create: {
            toStatus: 'FILED',
            changedById: reporterId,
            note: 'Initial report filed'
          }
        }
      },
      include: { reporter: true, driver: true }
    });
  });

  const createdCases = await prisma.$transaction(createPromises);

  return {
    groupId: generatedGroupId,
    cases: createdCases
  };
};

// ดึงรายการ Report ทั้งหมด (สามารถใส่เงื่อนไข filter และ order ได้)
const getReports = async (where = {}, orderBy = { createdAt: "desc" }) => {
  return prisma.reportCase.findMany({
    where,
    include: {
      reporter: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      driver: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      booking: true,
      route: true,
    },
    orderBy
  });
};

// ดึงรายละเอียด Report รายเคส พร้อมประวัติสถานะและหลักฐาน
const getReportById = async (id) => {
  return prisma.reportCase.findUnique({
    where: { id },
    include: {
      reporter: {
        select: { id: true, username: true, email: true, firstName: true, lastName: true }
      },
      driver: {
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          yellowCardCount: true,
          yellowCardExpiresAt: true,
          driverSuspendedUntil: true,
          passengerSuspendedUntil: true,
          isActive: true
        }
      },
      booking: true,
      route: {
        include: {
          bookings: {
            include: {
              passenger: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  yellowCardCount: true,
                  yellowCardExpiresAt: true,
                  driverSuspendedUntil: true,
                  passengerSuspendedUntil: true
                }
              }
            }
          }
        }
      },
      resolvedBy: {
        select: { id: true, firstName: true, lastName: true }
      },
      evidences: true,
      statusHistory: {
        include: { changedBy: { select: { id: true, username: true } } },
        orderBy: { createdAt: "desc" }
      }
    }
  });
};

// อัปเดตสถานะ Report, บันทึกประวัติ, และจัดการระบบใบเหลือง/ใบแดงอัตโนมัติ
const updateReportStatus = async (id, payload) => {
  return prisma.$transaction(async (tx) => {

    const currentReport = await tx.reportCase.findUnique({
      where: { id }
    });

    if (!currentReport) return null;

    if (currentReport.status === payload.status) {
      throw new Error('Report already in this status');
    }
    
    if (['RESOLVED', 'REJECTED'].includes(payload.status) && !payload.resolvedById) {
      throw new Error('ResolvedById is required for decision');
    }
    
    if (payload.status === 'CLOSED' && 
      !['RESOLVED', 'REJECTED'].includes(currentReport.status)) {
      throw new Error('Cannot close report before decision');
    }

    const updateData = {
      status: payload.status,
      adminNotes: payload.adminNotes ?? currentReport.adminNotes,
    };

    if (['RESOLVED', 'REJECTED'].includes(payload.status)) {
      updateData.resolvedById = payload.resolvedById;
      updateData.resolvedAt = new Date();
    }

    if (payload.status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updatedReport = await tx.reportCase.update({
      where: { id },
      data: updateData
    });

    await tx.reportCaseStatusHistory.create({
      data: {
        reportCaseId: id,
        fromStatus: currentReport.status,
        toStatus: payload.status,
        changedById: payload.resolvedById || currentReport.resolvedById,
        note: payload.note || `Status updated to ${payload.status}`
      }
    });

    // ===== Notification Section =====
    if (['REJECTED', 'RESOLVED'].includes(payload.status)) {

      let bodyMessage = '';

      if (payload.status === 'REJECTED') {
        bodyMessage = 'เคสของคุณถูกปฏิเสธ';

        if (payload.adminNotes && payload.adminNotes.trim().length > 0) {
          bodyMessage += `\nเหตุผล: ${payload.adminNotes}`;
        } else {
          bodyMessage += '\nหากต้องการข้อมูลเพิ่มเติม กรุณาติดต่อฝ่ายสนับสนุน';
        }

      } else if (payload.status === 'RESOLVED') {
        bodyMessage = 'เคสของคุณได้รับการดำเนินการแล้ว';

        if (payload.adminNotes && payload.adminNotes.trim().length > 0) {
          bodyMessage += `\nหมายเหตุ: ${payload.adminNotes}`;
        }
      }

      await tx.notification.create({
        data: {
          userId: currentReport.reporterId,
          type: 'SYSTEM',
          title: 'ผลการดำเนินการรายงานของคุณ',
          body: bodyMessage,
          link: `/reports/${id}`
        }
      });
    }

    // แจกใบเหลือง
    if (payload.status === 'RESOLVED') {
      await handleYellowCard(tx, currentReport.driverId);
  // ระบบแจกใบเหลือง (เมื่อเคสถูกตั้งเป็น RESOLVED)
  // if (status === 'RESOLVED') {
  //   const targetUserId = currentReport.driverId;
  //   const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

  //   if (targetUser) {
  //     const now = new Date();
  //     let currentCards = targetUser.yellowCardCount || 0;

  //     if (targetUser.yellowCardExpiresAt && targetUser.yellowCardExpiresAt < now) {
  //       currentCards = 0;
  //     }

  //     currentCards += 1;

  //     // ถ้าครบ 3 ใบแบนถาวรลงตาราง Blacklist และรีเซ็ตใบเหลือง
  //     if (currentCards >= 3) {
  //       await prisma.$transaction([
  //         prisma.user.update({
  //           where: { id: targetUserId },
  //           data: { 
  //             yellowCardCount: 0, 
  //             yellowCardExpiresAt: null,
  //             isActive: false 
  //           }
  //         }),

  //         prisma.blacklist.create({
  //           data: {
  //             userId: targetUserId,
  //             type: targetUser.role === 'PASSENGER' ? 'PASSENGER' : 'DRIVER',
  //             reason: `สะสมใบเหลืองครบ 3 ใบ (จากเคส: ${id})`,
  //             createdById: resolvedById,
  //             status: 'ACTIVE',
  //             suspendedUntil: null // แบนถาวร
  //           }
  //         })
  //       ]);
  //     } else {

  //       const newExpiresAt = new Date();
  //       newExpiresAt.setDate(newExpiresAt.getDate() + 30);

  //       await prisma.user.update({
  //         where: { id: targetUserId },
  //         data: {
  //           yellowCardCount: currentCards,
  //           yellowCardExpiresAt: newExpiresAt
  //         }
  //       });
  //     }
    }

    return updatedReport;
  });
};

// จัดการใบเหลือง
const handleYellowCard = async (tx, userId) => {

  const user = await tx.user.findUnique({
    where: { id: userId }
  });

  if (!user) return;

  const now = new Date();
  let currentCards = user.yellowCardCount || 0;

  // ถ้าหมดรอบ 30 วัน -> เริ่มใหม่
  if (!user.yellowCardExpiresAt || user.yellowCardExpiresAt < now) {
    currentCards = 0;
  }

  currentCards += 1;

  // ครบ 3 ใบใน 30 วัน -> แบน 30 วัน
  if (currentCards >= 3) {

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + 30);

    await tx.user.update({
      where: { id: userId },
      data: {
        yellowCardCount: 0,
        yellowCardExpiresAt: null,
        ...(user.role === 'DRIVER'
          ? { driverSuspendedUntil: suspendUntil }
          : { passengerSuspendedUntil: suspendUntil })
      }
    });

  } else {

    // ยังไม่ครบ 3 ใบ ในรอบ 30 วัน
    const newWindow = new Date();
    newWindow.setDate(newWindow.getDate() + 30);

    await tx.user.update({
      where: { id: userId },
      data: {
        yellowCardCount: currentCards,
        yellowCardExpiresAt: newWindow
      }
    });

  }
};

// แนบหลักฐานให้ทุกเคสที่อยู่ในกลุ่มเดียวกัน (ใช้ GroupId)
const addEvidencesToReportGroup = async (groupId, evidencesData, uploadedById) => {
  const casesInGroup = await prisma.reportCase.findMany({
    where: { groupId }
  });

  if (casesInGroup.length === 0) {
    throw new Error("Report group not found");
  }

  const formattedData = [];
  casesInGroup.forEach((reportCase) => {
    evidencesData.forEach((evidence) => {
      formattedData.push({
        reportCaseId: reportCase.id, 
        type: evidence.type,
        url: evidence.url,
        fileName: evidence.fileName,
        mimeType: evidence.mimeType,
        fileSize: evidence.fileSize,
        uploadedById
      });
    });
  });

  return prisma.reportEvidence.createMany({
    data: formattedData
  });
};

module.exports = {
  createReportCase,
  getReports,
  getReportById,
  updateReportStatus,
  addEvidencesToReportGroup
};