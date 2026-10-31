const express = require('express');
const { body } = require('express-validator');
const { protect, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const app = require('../controllers/application.controller');
const drive = require('../controllers/drive.controller');
const iv = require('../controllers/interview.controller');
const assess = require('../controllers/assessment.controller');
const offer = require('../controllers/offer.controller');
const j = require('../controllers/job.controller');
const s = require('../controllers/student.controller');
const m = require('../controllers/misc.controller');
const chatbot = require('../controllers/chatbot.controller');
const { driveRules, interviewRules, assessmentRules, assessmentPatchRules, questionRules } = require('../validators/rules');

const router = express.Router();

// ---- saved jobs / external / skills (student) ----
router.get('/saved-jobs', protect, requireRole('student'), j.listSaved);
router.post('/saved-jobs', protect, requireRole('student'), [body('jobId').isMongoId()], validate, j.saveJob);
router.delete('/saved-jobs/:jobId', protect, requireRole('student'), j.unsaveJob);
router.get('/external-jobs', protect, requireRole('student'), j.externalJobs);
router.get('/skills', protect, s.allSkills);
router.get('/resumes/:id/download', protect, s.downloadResume);

// ---- applications ----
router.post('/applications', protect, requireRole('student'), [body('jobId').isMongoId().withMessage('Invalid job.')], validate, app.apply);
router.get('/applications/mine', protect, requireRole('student'), app.myApplications);
router.get('/applications/:id', protect, app.getOne);
router.patch('/applications/:id/status', protect, requireRole('tpo', 'company'), [body('status').notEmpty()], validate, app.updateStatus);

// ---- drives ----
router.get('/drives', protect, drive.list);
router.get('/drives/history', protect, requireRole('tpo'), drive.history);
router.post('/drives', protect, requireRole('tpo'), driveRules, validate, drive.create);
router.get('/drives/conflict-check', protect, requireRole('tpo'), drive.conflictCheck);
router.get('/drives/:id', protect, drive.getOne);
router.patch('/drives/:id', protect, requireRole('tpo'), drive.update);
router.delete('/drives/:id', protect, requireRole('tpo'), drive.remove);
router.put('/drives/:id/eligibility', protect, requireRole('tpo'), drive.putEligibility);
router.get('/drives/:id/eligibility', protect, requireRole('student'), drive.myEligibility);
router.post('/drives/:id/register', protect, requireRole('student'), drive.register);
router.get('/drives/:id/registrations', protect, requireRole('tpo', 'company'), drive.registrations);
router.patch('/drives/:id/registrations/:regId', protect, requireRole('tpo'), drive.patchRegistration);

// ---- interviews ----
router.get('/interviews/mine', protect, requireRole('student'), iv.mine);
router.get('/interviews/company', protect, requireRole('company'), iv.companyList);
router.get('/interviews', protect, requireRole('tpo'), iv.all);
router.get('/interviews/:id', protect, iv.getOne);
router.post('/interviews', protect, requireRole('company'), interviewRules, validate, iv.schedule);
router.patch('/interviews/:id', protect, requireRole('company', 'tpo'), iv.patch);
router.delete('/interviews/:id', protect, requireRole('company', 'tpo'), iv.remove);

// ---- assessments ----
router.get('/assessments', protect, assess.list);
router.post('/assessments', protect, requireRole('company'), assessmentRules, validate, assess.create);
router.get('/assessments/results', protect, requireRole('company'), assess.companyResults);
router.patch('/assessments/:id', protect, requireRole('company'), assessmentPatchRules, validate, assess.update);
router.delete('/assessments/:id', protect, requireRole('company'), assess.remove);
router.post('/assessments/:id/publish', protect, requireRole('company'), assess.publish);
router.post('/assessments/:id/unpublish', protect, requireRole('company'), assess.unpublish);
router.post('/assessments/:id/generate', protect, requireRole('company'), assess.generate);
router.get('/assessments/:id/questions', protect, assess.listQuestions);
router.post('/assessments/:id/questions', protect, requireRole('company'), questionRules, validate, assess.addQuestion);
router.post('/assessments/:id/questions/:qid/regenerate', protect, requireRole('company'), assess.regenerateQuestion);
router.get('/assessments/:id', protect, requireRole('company', 'tpo'), assess.getOne);
router.patch('/assessments/:id/questions/:qid', protect, requireRole('company'), assess.patchQuestion);
router.delete('/assessments/:id/questions/:qid', protect, requireRole('company'), assess.deleteQuestion);
router.get('/assessments/:id/results', protect, requireRole('company', 'tpo'), assess.results);
router.get('/assessments/:id/violations', protect, requireRole('company', 'tpo'), assess.violations);
router.post('/assessments/:id/start', protect, requireRole('student'), [body('sessionId').optional().isString()], assess.start);
router.get('/attempts/mine', protect, requireRole('student'), assess.myAttempts);
router.get('/attempts/:id/monitor', protect, requireRole('company', 'tpo'), assess.attemptMonitor);
router.post('/attempts/:id/answer', protect, requireRole('student'), assess.saveAnswer);
router.post('/attempts/:id/heartbeat', protect, requireRole('student'), assess.heartbeat);
router.post('/attempts/:id/violation', protect, requireRole('student'), assess.violation);
router.post('/attempts/:id/submit', protect, requireRole('student'), assess.submit);
router.get('/attempts/:id/result', protect, assess.result);
router.get('/attempts/:id/result.pdf', protect, assess.resultPdf);

// ---- selections / offers / placements ----
router.post('/selections', protect, requireRole('company'), offer.decide);
router.get('/selections', protect, requireRole('company', 'tpo'), offer.listSelections);
router.post('/offers', protect, requireRole('company'), (req, res, next) => require('../middleware/upload').uploader('offer')(req, res, (e) => (e ? next(e) : next())), offer.createOffer);
router.get('/offers/company', protect, requireRole('company'), offer.companyOffers);
router.get('/offers/mine', protect, requireRole('student'), offer.myOffers);
router.get('/offers', protect, requireRole('tpo'), offer.allOffers);
router.get('/offers/:id', protect, offer.getOne);
router.patch('/offers/:id', protect, requireRole('company'), (req, res, next) => require('../middleware/upload').uploader('offer')(req, res, (e) => (e ? next(e) : next())), offer.patchOffer);
router.post('/offers/:id/issue', protect, requireRole('company'), offer.issueOffer);
router.get('/offers/:id/letter', protect, offer.letterPdf);
router.post('/offers/:id/withdraw', protect, requireRole('company', 'tpo'), offer.withdrawOffer);
router.post('/offers/:id/accept', protect, requireRole('student'), offer.acceptOffer);
router.post('/offers/:id/reject', protect, requireRole('student'), offer.rejectOffer);
router.get('/placements/mine', protect, requireRole('student'), offer.myPlacements);
router.get('/placements', protect, requireRole('tpo', 'company'), offer.allPlacements);

// ---- notifications / announcements / audit / ai / health ----
router.get('/notifications', protect, m.listNotif);
router.get('/notifications/unread-count', protect, m.unreadCount);
router.patch('/notifications/read-all', protect, m.markAll);
router.patch('/notifications/:id/read', protect, m.markRead);
router.delete('/notifications/:id', protect, m.deleteNotif);
router.get('/announcements', protect, requireRole('tpo'), m.listAnn);
router.get('/announcements/active', protect, m.activeAnn);
router.post('/announcements', protect, requireRole('tpo'), [body('title').notEmpty(), body('message').notEmpty(), body('publishDate').isISO8601()], validate, m.createAnn);
router.patch('/announcements/:id', protect, requireRole('tpo'), m.patchAnn);
router.delete('/announcements/:id', protect, requireRole('tpo'), m.deleteAnn);
router.post('/announcements/:id/publish', protect, requireRole('tpo'), m.publishAnn);
router.get('/audit-logs', protect, requireRole('tpo'), m.listAudit);
router.post('/ai/chat', protect, requireRole('student'), chatbot.chat);
router.get('/health', m.health);

module.exports = router;
