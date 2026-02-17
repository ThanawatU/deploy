const { prisma } = require("../utils/prisma");
const { auditLog, getUserFromRequest } = require('../utils/auditLog');

exports.createBlacklist = async (req, res) => {
  try {
    const { userId, type, reason, suspendDays } = req.body;

    const days = Number(suspendDays);
    if (!days || days < 1) {
      return res.status(400).json({ message: "Invalid suspendDays" });
    }

    const adminId = req.user.id;

    const bannedAt = new Date();
    const liftedAt = new Date(bannedAt);
    liftedAt.setDate(liftedAt.getDate() + days);

    const result = await prisma.$transaction(async (tx) => {

      const blacklist = await tx.blacklist.create({
        data: {
          type,
          reason,
          liftedAt,

          user: {
            connect: { id: userId }
          },

          createdBy: {
            connect: { id: adminId }
          }
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      return blacklist;
    });

    res.status(201).json({
      message: "Blacklist created successfully",
      data: result
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create blacklist" });
  }
};

exports.getBlacklists = async (req, res) => {
  try {
    const {
      gender,
      isActive,
      sortCreated,
      sortLifted,
      q
    } = req.query;

    const where = {};

    // search
    if (q) {
      where.OR = [
        { reason: { contains: q, mode: "insensitive" } },
        {
          user: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          }
        }
      ];
    }

    // gender filter
    if (gender) {
      where.user = {
        ...where.user,
        gender
      };
    }

    // isActive filter
    if (isActive === "true" || isActive === "false") {
      where.user = {
        ...where.user,
        isActive: isActive === "true"
      };
    }

    // sorting
    let orderBy = [];

    if (sortCreated === "asc" || sortCreated === "desc") {
      orderBy.push({ createdAt: sortCreated });
    }

    if (sortLifted === "asc" || sortLifted === "desc") {
      orderBy.push({ liftedAt: sortLifted });
    }

    if (orderBy.length === 0) {
      orderBy = [{ createdAt: "desc" }]; // default
    }

    const records = await prisma.blacklist.findMany({
      where,
      include: {
        user: true,
        evidences: true
      },
      orderBy
    });

    res.json(records);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch blacklists" });
  }
};


exports.getBlacklistById = async (req, res) => {
  const { id } = req.params;

  const record = await prisma.blacklist.findUnique({
    where: { id },
    include: {
      user: true,
      evidences: true
    }
  });

  if (!record) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(record);
};

exports.liftBlacklist = async (req, res) => {
  const { id } = req.params;

  const updated = await prisma.blacklist.update({
    where: { id },
    data: {
      status: "LIFTED",
      liftedAt: new Date(),
      liftedById: req.user.id
    }
  });

  await auditLog({
    ...getUserFromRequest(req),
    action: 'REMOVE_FROM_BLACKLIST',
    entity: 'Blacklist',
    entityId: id,
    req,
    metadata: {
      userId: updated.userId,
      type: updated.type,
      reason: updated.reason
    }
  });

  res.json(updated);
};

exports.checkBlacklist = async (userId) => {
  const activeBlacklist = await prisma.blacklist.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [
        { suspendedUntil: null },
        { suspendedUntil: { gt: new Date() } }
      ]
    }
  });

  return activeBlacklist;
};

exports.addEvidence = async (req, res) => {
  const { id } = req.params;
  const { type, url } = req.body;

  const evidence = await prisma.blacklistEvidence.create({
    data: {
      blacklistId: id,
      type,
      url,
      uploadedById: req.user.id
    }
  });

  res.status(201).json(evidence);
};

exports.updateBlacklist = async (req, res) => {
  const { id } = req.params;
  const { reason, status, suspendedUntil } = req.body;

  let suspendedUntilValue = null;

  if (suspendedUntil) {
    suspendedUntilValue = new Date(suspendedUntil);
  }

  const updated = await prisma.blacklist.update({
    where: { id },
    data: {
      reason,
      status,
      suspendedUntil: suspendedUntilValue
    }
  });

  res.json(updated);
};

