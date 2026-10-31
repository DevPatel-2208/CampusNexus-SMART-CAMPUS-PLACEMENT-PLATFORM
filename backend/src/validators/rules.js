const { body, param } = require('express-validator');

const email = body('email').isEmail().withMessage('Please enter a valid email address.').isLength({ max: 190 });
const password = (f = 'password') => body(f).isString().isLength({ min: 8 }).withMessage('Password must contain at least 8 characters.');
const objectId = (f) => param(f).isMongoId().withMessage('Invalid id.');

const registerRules = [
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Name must be between 3 and 120 characters.'),
  email, password(), body('role').isIn(['student', 'company']).withMessage('Invalid role.'),
];
const loginRules = [email, body('password').notEmpty().withMessage('Password is required.')];
const verifyRules = [body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Code must be 6 digits.')];

const jobRules = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 180 }),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('location').trim().notEmpty().withMessage('Location is required.'),
  body('jobType').isIn(['Full Time', 'Part Time', 'Internship', 'Fresher', 'Experienced']).withMessage('Invalid job type.'),
  body('workMode').isIn(['Onsite', 'Remote', 'Hybrid']).withMessage('Invalid work mode.'),
  body('deadline').isISO8601().withMessage('Invalid deadline.'),
];

const driveRules = [
  body('driveTitle').trim().notEmpty().isLength({ max: 180 }).withMessage('Drive title is required.'),
  body('driveDate').isISO8601().withMessage('Invalid drive date.'),
  body('mode').optional().isIn(['Online', 'Offline', 'Hybrid']).withMessage('Invalid mode.'),
];

const interviewRules = [
  body('applicationId').isMongoId().withMessage('Invalid application.'),
  body('roundName').optional().isIn(['Technical Round', 'HR Round', 'Final Round', 'Other']),
  body('interviewDate').isISO8601().withMessage('Invalid date.'),
  body('interviewTime').notEmpty().withMessage('Time is required.'),
  body('mode').isIn(['Online', 'Offline', 'Hybrid', 'Telephonic', 'Video']).withMessage('Invalid mode.'),
];

const assessmentRules = [
  body('title').trim().notEmpty().isLength({ max: 180 }).withMessage('Title is required.'),
  body('job').isMongoId().withMessage('Choose a valid job for this assessment.'),
  body('durationMinutes').isInt({ min: 1, max: 600 }).withMessage('Duration must be 1–600 minutes.'),
  body('totalMarks').isInt({ min: 1, max: 1000 }).withMessage('Total marks must be 1–1000.'),
  body('passingPercentage').isFloat({ min: 0, max: 100 }).withMessage('Passing percentage must be 0–100.'),
  body('numQuestions').optional().isInt({ min: 1, max: 50 }).withMessage('Questions must be 1–50.'),
  body('difficulty').optional().isIn(['Easy', 'Medium', 'Hard', 'Mixed']).withMessage('Choose a valid difficulty.'),
  body('categories').isIn(['Technical', 'Programming', 'Aptitude', 'Logical Reasoning', 'Mixed']).withMessage('Choose a valid assessment category.'),
  body('technology').custom((value, { req }) => {
    if (req.body.categories !== 'Mixed' && !String(value || '').trim()) throw new Error('Add a topic for this assessment category.');
    return true;
  }),
  body('negativeMarking').optional().isBoolean().withMessage('Negative marking must be enabled or disabled.'),
  body('negativeMarks').custom((value, { req }) => {
    const enabled = req.body.negativeMarking === true || req.body.negativeMarking === 'true';
    if (enabled && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 10)) throw new Error('Negative marks must be a whole number from 1 to 10.');
    return true;
  }),
];
const questionRules = [
  body('question').trim().notEmpty().withMessage('Question text is required.'),
  body('correctAnswer').isIn(['A', 'B', 'C', 'D']).withMessage('correctAnswer must be A–D.'),
];

const assessmentPatchRules = [
  body('title').optional().trim().notEmpty().isLength({ max: 180 }).withMessage('Title is required.'),
  body('job').optional().isMongoId().withMessage('Choose a valid job for this assessment.'),
  body('durationMinutes').optional().isInt({ min: 1, max: 600 }).withMessage('Duration must be 1–600 minutes.'),
  body('totalMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Total marks must be 1–1000.'),
  body('passingPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Passing percentage must be 0–100.'),
  body('numQuestions').optional().isInt({ min: 1, max: 50 }).withMessage('Questions must be 1–50.'),
  body('difficulty').optional().isIn(['Easy', 'Medium', 'Hard', 'Mixed']).withMessage('Choose a valid difficulty.'),
  body('categories').optional().isIn(['Technical', 'Programming', 'Aptitude', 'Logical Reasoning', 'Mixed']).withMessage('Choose a valid assessment category.'),
  body('technology').custom((value, { req }) => {
    if (req.body.categories && req.body.categories !== 'Mixed' && !String(value || '').trim()) throw new Error('Add a topic for this assessment category.');
    return true;
  }),
  body('negativeMarking').optional().isBoolean().withMessage('Negative marking must be enabled or disabled.'),
  body('negativeMarks').custom((value, { req }) => {
    const enabled = req.body.negativeMarking === true || req.body.negativeMarking === 'true';
    if (enabled && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 10)) throw new Error('Negative marks must be a whole number from 1 to 10.');
    return true;
  }),
];

const educationRules = [
  body('qualification').isIn(['10th', '12th', 'Diploma', 'Graduation', 'Post Graduation', 'Other']).withMessage('Invalid qualification.'),
  body('institute').trim().notEmpty().isLength({ max: 180 }).withMessage('Institute is required.'),
];

const contactRules = [
  body('name').trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('subject').trim().notEmpty().isLength({ max: 180 }).withMessage('Subject is required.'),
  body('message').trim().notEmpty().withMessage('Message is required.'),
];

module.exports = { registerRules, loginRules, verifyRules, jobRules, driveRules, interviewRules, assessmentRules, assessmentPatchRules, questionRules, educationRules, contactRules, objectId };
