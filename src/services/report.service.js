const { prisma } = require("../utils/prisma");
const crypto = require('crypto'); // ใช้สำหรับสร้างรหัสกลุ่ม

// สร้าง Report ใหม่ และบันทึกประวัติสถานะแรก (FILED)
const createReportCase = async (data) => {
  const { reporterId, reportedUserIds, bookingId, routeId, category, description } = data;

  //เพิ่มเช็คกันรายงานซ้ำ
  //const activeStatuses = ['FILED', 'UNDER_REVIEW', 'INVESTIGATING'];
  const activeStatuses = ['FILED', 'UNDER_REVIEW'];

  const existingReports = await prisma.reportCase.findMany({
    where: {
      reporterId,
      driverId: { in: reportedUserIds },
      bookingId: bookingId || null,
      status: { in: activeStatuses }
    }
  });

  if (existingReports.length > 0) {
    throw new Error("คุณได้รายงานรายการนี้แล้ว กรุณารอให้การตรวจสอบเสร็จสิ้น");
  }
  //จบส่วนที่เพิ่ม

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

// ดึงรายการ Report ทั้งหมด (ทำการ Group รหัส REP-xxx ให้แล้ว)
const getReports = async (where = {}, orderBy = { createdAt: "desc" }) => {
  const records = await prisma.reportCase.findMany({
    where,
    include: {
      reporter: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      driver: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      booking: true,
      route: true,
      evidences: true
    },
    orderBy
  });

  const grouped = {};
  const result = [];

  for (const record of records) {
    const key = record.groupId || record.id;
    if (!grouped[key]) {
      grouped[key] = {
        ...record,
        id: key, // สวมรอยใช้ groupId เป็น id หลัก
        isGroup: !!record.groupId,
        reportedUsers: [record.driver] // เก็บรายชื่อคนที่ถูกรีพอร์ตทั้งหมดลง Array
      };
      result.push(grouped[key]);
    } else {
      grouped[key].reportedUsers.push(record.driver);
    }
  }

  // ปรับแต่งชื่อคนถูกรีพอร์ตให้โชว์รวบกันในหน้าตาราง (เช่น นาย A, นาย B)
  result.forEach(r => {
    if (r.reportedUsers.length > 1) {
      r.driver = {
        ...r.reportedUsers[0],
        username: r.reportedUsers.map(u => u.username).join(', '),
        firstName: r.reportedUsers.map(u => u.firstName).join(', '),
        lastName: ''
      };
    }
  });

  return result;
};

// ดึงรายละเอียด Report รายเคส พร้อมประวัติสถานะและหลักฐาน
const getReportById = async (id) => {
  const isGroup = id.startsWith('REP-');
  const includeOptions = {
    reporter: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
    driver: {
      select: {
        id: true, username: true, email: true, firstName: true, lastName: true,
        yellowCardCount: true, yellowCardExpiresAt: true, driverSuspendedUntil: true, passengerSuspendedUntil: true, isActive: true
      }
    },
    booking: true,
    route: { 
      include: {
        driver: { 
          select: { 
            id: true, firstName: true, lastName: true, 
            yellowCardCount: true, driverSuspendedUntil: true, passengerSuspendedUntil: true 
          } 
        },
        bookings: { 
          include: { 
            passenger: { 
              select: { 
                id: true, firstName: true, lastName: true, 
                yellowCardCount: true, driverSuspendedUntil: true, passengerSuspendedUntil: true 
              } 
            } 
          } 
        } 
      } 
    },
    resolvedBy: { select: { id: true, firstName: true, lastName: true } },
    evidences: true,
    statusHistory: { include: { changedBy: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" } }
  };
  if (isGroup) {
    const cases = await prisma.reportCase.findMany({
      where: { groupId: id },
      include: includeOptions,
      orderBy: { createdAt: "asc" }
    });

    if (!cases.length) return null;
    return {
      ...cases[0],
      id, // คง ID เป็น REP-xxx ไว้ให้ Frontend
      isGroup: true,
      reportedUsers: cases.map(c => c.driver), // ส่งรายชื่อคนโดนรีพอร์ตทั้งหมดให้ Frontend แสดงผล
      cases
    };
  } else {
    const report = await prisma.reportCase.findUnique({ where: { id }, include: includeOptions });
    if (!report) return null;
    return { ...report, isGroup: false, reportedUsers: [report.driver] };
  }
};

// อัปเดตสถานะ Report, บันทึกประวัติ, และจัดการระบบใบเหลือง/ใบแดงอัตโนมัติ
const updateReportStatus = async (id, payload) => {
  return prisma.$transaction(async (tx) => {
    const isGroup = id.startsWith('REP-');
    const casesToUpdate = isGroup 
      ? await tx.reportCase.findMany({ where: { groupId: id } })
      : [await tx.reportCase.findUnique({ where: { id } })].filter(Boolean);

    if (!casesToUpdate.length) return null;

    const updatedCases = [];
    let notificationSent = false;

    for (const currentReport of casesToUpdate) {
      if (currentReport.status === payload.status) continue;
      
      if (['RESOLVED', 'REJECTED'].includes(payload.status) && !payload.resolvedById) {
        throw new Error('ResolvedById is required for decision');
      }
      
      if (payload.status === 'CLOSED' && !['RESOLVED', 'REJECTED'].includes(currentReport.status)) {
        throw new Error('Cannot close report before decision');
      }
      
      const updateData = { status: payload.status, adminNotes: payload.adminNotes ?? currentReport.adminNotes };
      
      if (['RESOLVED', 'REJECTED'].includes(payload.status)) {
        updateData.resolvedById = payload.resolvedById;
        updateData.resolvedAt = new Date();
      }
      if (payload.status === 'CLOSED') {
        updateData.closedAt = new Date();
      }

      const updatedReport = await tx.reportCase.update({
        where: { id: currentReport.id },
        data: updateData
      });

      await tx.reportCaseStatusHistory.create({
        data: {
          reportCaseId: currentReport.id,
          fromStatus: currentReport.status, 
          toStatus: payload.status,
          changedById: payload.resolvedById || currentReport.resolvedById,
          note: payload.note || `Status updated to ${payload.status}`
        }
      });

      if (payload.status === 'RESOLVED') {
        await handleYellowCard(tx, currentReport.driverId);
      }
      updatedCases.push(updatedReport);
    }

    // แจ้งเตือนคนแจ้งแค่ 1 ครั้งต่อ 1 Group
    if (updatedCases.length > 0 && ['REJECTED', 'RESOLVED'].includes(payload.status) && !notificationSent) {
      let bodyMessage = payload.status === 'REJECTED' ? 'เคสของคุณถูกปฏิเสธ' : 'เคสของคุณได้รับการดำเนินการแล้ว';
      if (payload.adminNotes && payload.adminNotes.trim().length > 0) {
        bodyMessage += `\nเหตุผล: ${payload.adminNotes}`;
      } else if (payload.status === 'REJECTED') {
        bodyMessage += '\nหากต้องการข้อมูลเพิ่มเติม กรุณาติดต่อฝ่ายสนับสนุน';
      }

      await tx.notification.create({
        data: { 
          userId: updatedCases[0].reporterId, 
          type: 'SYSTEM', 
          title: 'ผลการดำเนินการรายงานของคุณ', 
          body: bodyMessage, 
          link: `/reports/${id}` 
        }
      });
      notificationSent = true;
    }
    
    return updatedCases;
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