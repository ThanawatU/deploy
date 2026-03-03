const express = require('express');
const blacklistController = require('../controllers/blacklist.controller');
const validate = require('../middlewares/validate');
const { protect, requireAdmin } = require('../middlewares/auth');
const {
  createBlacklistSchema,
  addEvidenceSchema,
  updateBlacklistSchema
} = require('../validations/blacklist.validation');

const router = express.Router();

// All routes require admin authentication
router.use(protect, requireAdmin);

// POST /api/admin/blacklists
router.post(
  '/',
  validate({ body: createBlacklistSchema }),
  blacklistController.createBlacklist
);

// GET /api/admin/blacklists
router.get(
  '/',
  blacklistController.getBlacklists
);

// GET /api/admin/blacklists/:id
router.get(
  '/:id',
  blacklistController.getBlacklistById
);

// PUT /api/admin/blacklists/:id
router.put(
  '/:id',
  validate({ body: updateBlacklistSchema }),
  blacklistController.updateBlacklist
);

// PATCH /api/admin/blacklists/:id/lift
router.patch(
  '/:id/lift',
  blacklistController.liftBlacklist
);

// POST /api/admin/blacklists/:id/evidence
router.post(
  '/:id/evidence',
  validate({ body: addEvidenceSchema }),
  blacklistController.addEvidence
);

module.exports = router;

