const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const t = require('../controllers/tpo.controller');
const { report } = require('../controllers/report.controller');

const router = express.Router();
router.use(protect, requireRole('tpo'));

router.get('/dashboard', t.dashboard);
router.get('/analytics', t.analytics);
router.get('/students', t.students);
router.get('/students/:id', t.studentDetail);
router.patch('/students/:id/status', t.studentStatus);
router.get('/companies', t.companies);
router.get('/companies/:id', t.companyDetail);
router.post('/companies/:id/verify', t.verifyCompany);
router.get('/jobs', t.jobs);
router.post('/jobs/:id/approve', t.approveJob);
router.get('/applications', t.applications);
router.get('/attempts', t.attempts);
router.get('/assessments/:id/attempts', t.assessmentAttempts);
router.get('/violations', t.tpoViolations);
router.get('/assessments', t.tpoAssessments);
router.get('/reports/:type', report);

module.exports = router;
