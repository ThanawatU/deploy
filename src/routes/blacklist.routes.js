const express = require('express');
const blacklistController = require('../controllers/blacklist.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin} = require('../middlewares/auth');

const {
  createBlacklistSchema,
  addEvidenceSchema
} = require('../validations/blacklist.validation');

const router = express.Router();

// POST /api/blacklists
router.post(
  '/admin',
  protect,
  requireAdmin,
  validate({ body: createBlacklistSchema }),
  blacklistController.createBlacklist
);

// GET /api/blacklists/admin
router.get(
    '/admin',
    protect,
    requireAdmin,
    blacklistController.getBlacklists
)

// GET /api/blacklists/admin/:id
router.get(
    '/admin/:id',
    protect,
    requireAdmin,
    blacklistController.getBlacklistById
)

// PATCH /api/blacklists/admin/:id/lift
router.patch(
    '/admin/:id/lift',
    protect,
    requireAdmin,
    blacklistController.liftBlacklist
)

// POST /api/blacklists/admin/:id/evidence
router.post(
    '/admin/:id/evidence',
    protect,
    requireAdmin,
    validate({ body: addEvidenceSchema }),
    blacklistController.addEvidence
)

router.put(
    '/admin/:id',
    protect,
    requireAdmin,
    blacklistController.updateBlacklist
)

module.exports = router;
