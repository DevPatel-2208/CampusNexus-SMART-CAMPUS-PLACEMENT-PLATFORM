const express = require('express');
const { body } = require('express-validator');
const { protect, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploader } = require('../middleware/upload');
const c = require('../controllers/company.controller');
const { jobRules } = require('../validators/rules');

const router = express.Router();
router.use(protect, requireRole('company'));

router.get('/dashboard', c.dashboard);
router.get('/profile', c.getProfile);
router.patch('/profile', c.patchProfile);
router.post('/profile/logo', (req, res, next) => uploader('logo')(req, res, (e) => (e ? next(e) : next())), c.uploadLogo);
router.get('/documents', c.listDocs);
router.post('/documents', (req, res, next) => uploader('document')(req, res, (e) => (e ? next(e) : next())), c.uploadDoc);
router.delete('/documents/:id', c.deleteDoc);

router.post('/jobs', jobRules, validate, c.createJob);
router.get('/jobs', c.listJobs);
router.get('/jobs/:id', c.getJob);
router.patch('/jobs/:id', c.patchJob);
router.post('/jobs/:id/toggle', c.toggleJob);
router.delete('/jobs/:id', c.deleteJob);

router.get('/applications', c.listApplications);
router.get('/applications/:id', c.getApplication);
router.get('/shortlisted', c.shortlisted);

module.exports = router;
