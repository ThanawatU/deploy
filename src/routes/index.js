const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const vehicleRoutes = require('./vehicle.routes');
const routeRoutes   = require('./route.routes');
const driverVerifRoutes = require('./driverVerification.routes');
const bookingRoutes = require('./booking.routes');
const notificationRoutes = require('./notification.routes')
const mapRoutes = require('./maps.routes')
const monitorRoutes = require('./monitor.routes');
const blacklistRoutes = require('./blacklist.routes');
const reportRoutes = require('./report.routes');
const exportRoutes = require('./export.routes');
const integrityRoutes = require('./integrity.routes');
const auditRoutes = require('./audit.routes');

const { prisma } = require("../utils/prisma"); // adjust path if needed

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/routes', routeRoutes);
router.use('/driver-verifications', driverVerifRoutes);
router.use('/bookings', bookingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/api/maps', mapRoutes); 

// monitor routes
router.use('/monitor', monitorRoutes);

// blacklist routes
router.use('/blacklists', blacklistRoutes);

// report routes
router.use('/reports', reportRoutes);

// export routes
router.use('/exports', exportRoutes);

// integrity routes
router.use('/integrity', integrityRoutes);

// audit log routes
router.use('/logs', auditRoutes);

module.exports = router;
