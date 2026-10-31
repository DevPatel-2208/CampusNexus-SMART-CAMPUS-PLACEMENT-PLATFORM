const express = require('express');
const { body } = require('express-validator');
const { protect, optionalAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const j = require('../controllers/job.controller');

const router = express.Router();

// Public job browsing (student extras need login)
router.get('/', j.listJobs);
// Public platform stats for marketing/landing pages (guests allowed)
router.get('/stats', j.publicStats);
// Public company directory (guests allowed — must stay above /:id)
router.get('/companies', j.listCompaniesPublic);
router.get('/recommended', protect, requireRole('student'), j.recommended);
router.get('/:id/eligibility', protect, requireRole('student'), j.jobEligibility);
router.get('/:id', optionalAuth, j.getJob);

// Skills catalog (any authenticated user) — mounted separately; see app.js
module.exports = router;
