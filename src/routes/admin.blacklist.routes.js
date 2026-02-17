const { prisma } = require("../prisma");


// Create Blacklist
const { userId, type, reason, suspendedUntil } = req.body;
const createBlacklist = async (req, res) => {

  const blacklist = await prisma.blacklist.create({
    data: {
      userId,
      type,
      reason,
      suspendedUntil,
      createdById: req.user.id
    }
  });

  res.status(201).json(blacklist);
};

// Add Evidence
const addEvidence = async (req, res) => {
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

// Get Blacklist List
const getBlacklists = async (req, res) => {
  const records = await prisma.blacklist.findMany({
    include: {
      user: true,
      evidences: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  res.json(records);
};

