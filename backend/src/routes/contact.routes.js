const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const m = require('../controllers/misc.controller');
const { contactRules } = require('../validators/rules');

const router = express.Router();
const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/', contactLimit, contactRules, validate, m.postContact);
router.get('/', protect, requireRole('tpo'), m.listContact);
router.patch('/:id', protect, requireRole('tpo'), m.patchContact);

module.exports = router;
