const reportService = require('../services/report.service');
const { auditLog, getUserFromRequest } = require('../utils/auditLog');
const { prisma } = require('../utils/prisma');

// สร้าง Report (รองรับทั้งคนเดียว และ หลายคนพร้อมกัน)
exports.createReport = async (req, res) => {
  try {
    const { reportedUserIds, bookingId, routeId, category, description } = req.body;
    const reporterId = req.user.id;

    const result = await reportService.createReportCase({
      reporterId,
      reportedUserIds,
      bookingId,
      routeId,
      category,
      description
    });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'CREATE_REPORT',
      entity: 'ReportCase',
      req,
      metadata: { 
        isGroup: result.groupId !== null, 
        groupId: result.groupId, 
        reportedCount: reportedUserIds.length 
      }
    });

    res.status(201).json({ 
      success: true, 
      message: result.groupId 
        ? `Successfully created group report with ${reportedUserIds.length} cases.` 
        : "Successfully created report case.",
      groupId: result.groupId,
      cases: result.cases,
      data: result.cases 
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.message.includes("รายงาน") ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message || "Failed to create reports" });
  }
};

// ดึงรายการ Report ทั้งหมด (สำหรับ Admin)
exports.getReports = async (req, res) => {
  try {
    const { status, category, q } = req.query;
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { driver: { username: { contains: q, mode: "insensitive" } } },
        { reporter: { username: { contains: q, mode: "insensitive" } } }
      ];
    }

    const records = await reportService.getReports(where);
    
    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_REPORTS',
      entity: 'ReportCase',
      req,
      metadata: { filters: { status, category, searchQuery: q } }
    });
    
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

// ดึงรายละเอียด Report รายเคส
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await reportService.getReportById(id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // เช็คสิทธิ์การเข้าดู
    if (req.user.role !== 'ADMIN' && req.user.id !== report.reporterId && req.user.id !== report.driverId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_REPORT',
      entity: 'ReportCase',
      entityId: id,
      req
    });

    console.log("🚀 [BACKEND DEBUG] Report ID:", id);
    console.log("🚀 [BACKEND DEBUG] Is Group?:", report.isGroup);
    console.log("🚀 [BACKEND DEBUG] Reported Users Array:", JSON.stringify(report.reportedUsers, null, 2));

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch report" });
  }
};

// อัปเดตสถานะ
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, note } = req.body;

    const result = await reportService.updateReportStatus(id, {
      status,
      adminNotes,
      resolvedById: req.user.id,
      note
    });

    if (!result) {
      return res.status(404).json({ message: "Report not found" });
    }

    await auditLog({
      ...getUserFromRequest(req),
      action: 'UPDATE_REPORT_STATUS',
      entity: 'ReportCase',
      entityId: id,
      req,
      metadata: { newStatus: status }
    });

    res.json({ message: "Report status updated", data: result[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update report status" });
  }
};

// เพิ่มหลักฐาน (รองรับทั้งส่งเข้า ID รายคน หรือส่งเข้า GroupID)
exports.addEvidence = async (req, res) => {
  try {
    const { id } = req.params; 
    const { evidences } = req.body;

    const isGroup = id.startsWith('REP-');

    // เรียก Service โดยส่ง Object ไปให้ถูกฟิลด์
    const result = await reportService.addEvidencesToReportGroup(
      isGroup ? id : null,
      evidences, 
      req.user.id
    );

    res.status(201).json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error Detail:", error);
    res.status(500).json({ message: "Failed to add evidences" });
  }
};

// ดึงประวัติการ Report ที่เราส่งเอง
exports.getMyReports = async (req, res) => {
  try {
    const records = await reportService.getReports({ reporterId: req.user.id });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_MY_REPORTS',
      entity: 'ReportCase',
      req,
      metadata: { recordCount: records.length }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch your reports" });
  }
};

// ดึงประวัติที่คนอื่นรีพอร์ตเรา
exports.getReportsAgainstMe = async (req, res) => {
  try {
    const records = await reportService.getReports({ driverId: req.user.id });

    await auditLog({
      ...getUserFromRequest(req),
      action: 'VIEW_REPORTS_AGAINST_ME',
      entity: 'ReportCase',
      req,
      metadata: { recordCount: records.length }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reports against you" });
  }
};

//assign admin ที่กดเข้ามาหน้า report
exports.issueYellowCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, adminComment, notificationType } = req.body;

    if (!userIds || !userIds.length) return res.status(400).json({ message: 'No users selected' });

    const isGroup = id.startsWith('REP-');
    let reportsToUpdate = isGroup 
      ? await prisma.reportCase.findMany({ where: { groupId: id } })
      : [await prisma.reportCase.findUnique({ where: { id } })].filter(Boolean);

    if (!reportsToUpdate.length) return res.status(404).json({ message: 'Report not found' });

    const results = [];
    await prisma.$transaction(async (tx) => {
      // 1. แจกใบเหลืองให้ User ที่เลือก
      for (const userId of userIds) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) continue;

        let currentCards = (user.yellowCardCount || 0) + 1;
        if (currentCards >= 3) {
          const suspendUntil = new Date(); suspendUntil.setDate(suspendUntil.getDate() + 30);
          await tx.user.update({
            where: { id: userId },
            data: { yellowCardCount: 0, yellowCardExpiresAt: null, ...(user.role === 'DRIVER' ? { driverSuspendedUntil: suspendUntil } : { passengerSuspendedUntil: suspendUntil }) }
          });
        } else {
          const newExpiresAt = new Date(); newExpiresAt.setDate(newExpiresAt.getDate() + 30);
          await tx.user.update({ where: { id: userId }, data: { yellowCardCount: currentCards, yellowCardExpiresAt: newExpiresAt } });
        }
        results.push(userId);
      }

      // 2. อัปเดตสถานะ Reports ทุกเคสใน Group
      for (const rep of reportsToUpdate) {
        await tx.reportCase.update({
          where: { id: rep.id },
          data: { status: 'RESOLVED', resolvedById: req.user.id, resolvedAt: new Date(), adminNotes: adminComment }
        });
        await tx.reportCaseStatusHistory.create({
          data: { reportCaseId: rep.id, fromStatus: rep.status, toStatus: 'RESOLVED', changedById: req.user.id, note: adminComment || 'Issue yellow card' }
        });
      }

      // 3. สร้าง Notification 1 ครั้ง
      const reporterId = reportsToUpdate[0].reporterId;
      let subTitle = notificationType === 'RESOLVED' ? 'เคสได้รับการดำเนินการแล้ว' : 'ได้ทำการมอบใบเหลืองแล้ว';
      const reasonText = adminComment ? `เหตุผล: ${adminComment}` : '';
      
      await tx.notification.create({
        data: { userId: reporterId, type: 'SYSTEM', title: 'ผลการดำเนินการรายงานของคุณ', body: `${subTitle}\n${reasonText}`.trim(), link: `/reports/${id}` }
      });
    });

    res.json({ message: 'Yellow card issued and report resolved', affectedUsers: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to issue yellow card' });
  }
};

/*
exports.issueYellowCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, adminComment, notificationType } = req.body;

    if (!userIds || !userIds.length) {
      return res.status(400).json({ message: 'No users selected' });
    }

    const report = await prisma.reportCase.findUnique({
      where: { id }
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const results = [];

    await prisma.$transaction(async (tx) => {

      for (const userId of userIds) {

        const user = await tx.user.findUnique({
          where: { id: userId }
        });

        if (!user) continue;

        let currentCards = user.yellowCardCount || 0;
        currentCards += 1;

        if (currentCards >= 3) {
          const suspendUntil = new Date()
          suspendUntil.setDate(suspendUntil.getDate() + 30)

          await tx.user.update({
            where: { id: userId },
            data: {
              yellowCardCount: 0,
              yellowCardExpiresAt: null,
              ...(user.role === 'DRIVER'
              ? { driverSuspendedUntil: suspendUntil }
              : { passengerSuspendedUntil: suspendUntil })
            }
          })

        } else {
          const newExpiresAt = new Date();
          newExpiresAt.setDate(newExpiresAt.getDate() + 30);

          await tx.user.update({
            where: { id: userId },
            data: {
              yellowCardCount: currentCards,
              yellowCardExpiresAt: newExpiresAt
            }
          });
        }

        results.push(userId);
      }

      // update report
      await tx.reportCase.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedById: req.user.id,
          resolvedAt: new Date(),
          adminNotes: adminComment
        }
      });

      // status history (เพิ่มตรงนี้ให้สมบูรณ์)
      await tx.reportCaseStatusHistory.create({
        data: {
          reportCaseId: id,
          fromStatus: report.status,
          toStatus: 'RESOLVED',
          changedById: req.user.id,
          note: adminComment || 'Issue yellow card'
        }
      });

      // หัวข้อหลัก
      const mainTitle = 'ผลการดำเนินการรายงานของคุณ';

      // หัวข้อย่อยจาก preset
      let subTitle = '';

      if (notificationType === 'RESOLVED') {
        subTitle = 'เคสได้รับการดำเนินการแล้ว';
      } else if (notificationType === 'WARNING_ISSUED') {
        subTitle = 'ได้ทำการมอบใบเหลืองแล้ว';
      }

      // สร้างข้อความเหตุผล
      const reasonText =
        adminComment && adminComment.trim().length > 0
          ? `เหตุผล: ${adminComment}`
          : '';

      // รวมข้อความทั้งหมด
      const fullMessage = `
      ${subTitle}
      ${reasonText}
      `.trim();

      // สร้าง notification
      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: 'SYSTEM',
          title: mainTitle,
          body: fullMessage,
          link: `/reports/${id}`
        }
      });

    });

    res.json({
      message: 'Yellow card issued and report resolved',
      affectedUsers: results
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to issue yellow card' });
  }
};
*/

// assign admin รับเรื่อง
exports.assignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const isGroup = id.startsWith('REP-');
    
    const reports = isGroup 
      ? await prisma.reportCase.findMany({ where: { groupId: id } })
      : [await prisma.reportCase.findUnique({ where: { id } })].filter(Boolean);

    if (!reports.length) return res.status(404).json({ message: 'Report not found' });
    if (!['FILED', 'PENDING'].includes(reports[0].status)) return res.status(400).json({ message: 'Report already assigned or processed' });

    await prisma.reportCase.updateMany({
      where: { id: { in: reports.map(r => r.id) } },
      data: { resolvedById: req.user.id, status: 'UNDER_REVIEW' }
    });

    const updated = await prisma.reportCase.findFirst({
      where: { id: reports[0].id },
      include: { resolvedBy: { select: { id: true, firstName: true, lastName: true } } }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to assign report' });
  }
};
/*
exports.assignReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.reportCase.findUnique({
      where: { id }
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (!['FILED', 'PENDING'].includes(report.status)) {
      return res.status(400).json({ message: 'Report already assigned or processed' });
    }

    const updated = await prisma.reportCase.update({
      where: { id },
      data: {
        resolvedById: req.user.id,
        status: 'UNDER_REVIEW'
      },
      include: {
        resolvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json(updated);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to assign report' });
  }
};
*/