const { prisma } = require("../utils/prisma"); // adjust path if needed

const logAudit = async ({
  userId,
  role,
  action,
  entity,
  entityId,
  req,
  metadata
}) => {
  try {
    const createdAt = new Date();
    
    await prisma.auditLog.create({
      data: {
        userId,
        role,
        action,
        entity,
        entityId,
        ipAddress: req?.ip,
        userAgent: req?.headers["user-agent"],
        metadata,
        createdAt
      }
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
};

module.exports = { logAudit };
