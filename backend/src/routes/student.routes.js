const express = require('express');
const { body } = require('express-validator');
const { protect, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploader } = require('../middleware/upload');
const s = require('../controllers/student.controller');
const { educationRules, objectId } = require('../validators/rules');

const router = express.Router();
router.use(protect, requireRole('student'));

router.get('/me', s.getMe);
router.patch('/me', [
  body('phone').optional({ nullable: true }).custom((v) => v === null || v === '' || /^[0-9+\-() ]{7,15}$/.test(v)).withMessage('Invalid phone number.'),
  body('cgpa').optional({ nullable: true }).isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10.'),
  body('passingYear').optional({ nullable: true }).isInt({ min: 1950, max: 2100 }).withMessage('Passing year is invalid.'),
  body('backlogs').optional().isInt({ min: 0, max: 50 }).withMessage('Backlogs must be between 0 and 50.'),
  body('gender').optional({ nullable: true }).isIn(['Male', 'Female', 'Other', null]),
], validate, s.patchMe);
router.post('/me/photo', (req, res, next) => uploader('photo')(req, res, (e) => (e ? next(e) : next())), s.uploadPhoto);

router.get('/education', s.education.list);
router.post('/education', educationRules, validate, s.education.create);
router.patch('/education/:id', objectId('id'), validate, s.education.update);
router.delete('/education/:id', objectId('id'), validate, s.education.remove);

router.get('/skills', s.mySkills);
router.post('/skills', [body('proficiency').optional().isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert'])], validate, s.addSkill);
router.delete('/skills/:skillId', s.removeSkill);

router.get('/projects', s.projects.list);
router.post('/projects', [body('title').notEmpty().withMessage('Title is required.')], validate, s.projects.create);
router.patch('/projects/:id', s.projects.update);
router.delete('/projects/:id', s.projects.remove);

router.get('/certifications', s.certifications.list);
router.post('/certifications', [body('name').notEmpty(), body('issuingOrganization').notEmpty()], validate, s.certifications.create);
router.patch('/certifications/:id', s.certifications.update);
router.delete('/certifications/:id', s.certifications.remove);

router.get('/resumes', s.getResumes);
router.post('/resumes', (req, res, next) => uploader('resume')(req, res, (e) => (e ? next(e) : next())), s.uploadResume);
router.delete('/resumes/:id', s.deleteResume);
router.get('/resumes/ats', s.getAts);

router.get('/preferences', s.getPreferences);
router.put('/preferences', s.putPreferences);
router.delete('/preferences', s.clearPreferences);

router.get('/job-alerts', s.listAlerts);
router.post('/job-alerts', [body('roleKeyword').notEmpty().withMessage('Keyword is required.')], validate, s.createAlert);
router.delete('/job-alerts/:id', s.deleteAlert);
router.get('/job-alerts/:id/matches', s.alertMatches);

module.exports = router;
