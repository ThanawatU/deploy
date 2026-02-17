const { prisma } = require("../utils/prisma");

const checkBlacklistByIdentifiers = async ({ email, nationalIdNumber, phoneNumber }) => {
    const orConditions = [];
    
    if (email) orConditions.push({ email });
    if (nationalIdNumber) orConditions.push({ nationalIdNumber });
    if (phoneNumber) orConditions.push({ phoneNumber });

    if (orConditions.length === 0) {
        return null;
    }

    const blacklistedUser = await prisma.user.findFirst({
        where: {
            OR: orConditions,
            blacklists: {
                some: {
                    status: "ACTIVE",
                    OR: [
                        { suspendedUntil: null },
                        { suspendedUntil: { gt: new Date() } }
                    ]
                }
            }
        },
        select: {
            id: true,
            email: true,
            nationalIdNumber: true,
            phoneNumber: true,
            blacklists: {
                where: {
                    status: "ACTIVE",
                    OR: [
                        { suspendedUntil: null },
                        { suspendedUntil: { gt: new Date() } }
                    ]
                },
                select: {
                    id: true,
                    type: true,
                    reason: true,
                    suspendedUntil: true,
                    createdAt: true
                },
                take: 1
            }
        }
    });

    if (!blacklistedUser || blacklistedUser.blacklists.length === 0) {
        return null;
    }

    const matchedIdentifier = 
        (email && blacklistedUser.email === email) ? 'email' :
        (nationalIdNumber && blacklistedUser.nationalIdNumber === nationalIdNumber) ? 'nationalIdNumber' :
        (phoneNumber && blacklistedUser.phoneNumber === phoneNumber) ? 'phoneNumber' : 
        'unknown';

    return {
        blacklist: blacklistedUser.blacklists[0],
        matchedIdentifier,
        matchedValue: blacklistedUser[matchedIdentifier]
    };
};

const checkBlacklistByUserId = async (userId) => {
    return prisma.blacklist.findFirst({
        where: {
            userId,
            status: "ACTIVE",
            OR: [
                { suspendedUntil: null },
                { suspendedUntil: { gt: new Date() } }
            ]
        }
    });
};

module.exports = {
    checkBlacklistByIdentifiers,
    checkBlacklistByUserId
};
