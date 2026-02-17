const { prisma } = require('../prisma');

exports.createBlacklist = async (req, res) => {
    try{
        const { userId, type, reason, suspendedUntil } = req.body;
        
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

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getBlacklists = async (req, res) => {
    try{
        const records = await prisma.blacklist.findMany({
            include: {
                user: true,
                evidences: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    res.json(records)
    
    }   catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.getBlacklistsById = async (req, res) => {
    try{
        const { id } = req.params;
        const record = await prisma.blacklist.findUnique({
            where: { id },
            include: {
                user: true,
                evidences: true
            }
        });
    if (!record) {
        return res.status(404).json({ error: "Blacklist record not found" });
    }
    res.json(record);

    }   catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.liftBlacklist = async (req, res) => {
    try{
        const { id } = req.params;
        const updated = await prisma.blacklist.update({
            where: { id },
            data: {
                liftedAt: new Date(),
                liftedById: req.user.id
            }
        });
    res.json(updated);

    }   catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.addEvidence = async (req, res) => {
    try{
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

    }   catch (error) {
        res.status(400).json({ error: error.message });
    }
}   