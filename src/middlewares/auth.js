const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const { prisma } = require('../utils/prisma');

const protect = asyncHandler(async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            // Get token from header
            token = authHeader.split(' ')[1];

            // Verify token
            const decoded = verifyToken(token);

            // Attach user to the request object
            req.user = {
                id: decoded.sub,
                sub: decoded.sub,
                role: decoded.role,
            };

            const user = await prisma.user.findUnique({
                where: { id: decoded.sub }
            });

            if (!user) {
                throw new ApiError(401, 'User not found');
            }

            //ระบบแบนชั่วคราว
            const now = new Date();
            if (
            (user.driverSuspendedUntil && user.driverSuspendedUntil > now) ||
            (user.passengerSuspendedUntil && user.passengerSuspendedUntil > now)
            ) {
            return res.status(403).json({
                message: 'บัญชีของคุณถูกระงับการใช้งานชั่วคราว'
            });
            }

            req.user = {
            id: user.id,
            sub: user.id, // เพิ่ม sub เพื่อ backward compatibility
            role: user.role
            };

            next();
        } catch (error) {
            console.error(error);
            throw new ApiError(401, 'Not authorized, token failed');
        }
    }

    if (!token) {
        throw new ApiError(401, 'Not authorized, no token');
    }
});

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        throw new ApiError(403, 'Forbidden: Admin access required');
    }
};

module.exports = { protect, requireAdmin };