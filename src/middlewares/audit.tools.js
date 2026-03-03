const { prisma } = require("../utils/prisma");
const GENESIS_HASH = "0".repeat(64);

const getSecret = () =>
  process.env.AUDIT_LOG_SECRET || "default-audit-secret-dev-only";

const getLatestAuditHash = async () => {
  const latest = await prisma.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select:  { integrityHash: true },
  });
  return latest?.integrityHash ?? GENESIS_HASH;
};

const getLatestSystemLogHash = async () => {
  const latest = await prisma.systemLog.findFirst({
    orderBy: { createdAt: "desc" },
    select:  { integrityHash: true },
  });
  return latest?.integrityHash ?? GENESIS_HASH;
};

const getLatestAccessLogHash = async () => {
  const latest = await prisma.accessLog.findFirst({
    orderBy: { createdAt: "desc" },
    select:  { integrityHash: true },
  });
  return latest?.integrityHash ?? GENESIS_HASH;
};

module.exports = {
  getSecret,
  getLatestAuditHash,
  getLatestSystemLogHash,
  getLatestAccessLogHash
};