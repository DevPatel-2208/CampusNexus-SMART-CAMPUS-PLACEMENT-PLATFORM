const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerRules, loginRules, verifyRules } = require('../validators/rules');
const { body } = require('express-validator');

const router = express.Router();
const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const otpLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

router.post('/register', strict, registerRules, validate, auth.register);
router.post('/login', strict, loginRules, validate, auth.login);
router.get('/google', auth.googleStart);
router.get('/google/callback', auth.googleCallback);
router.post('/logout', protect, auth.logout);
router.post('/refresh', auth.refresh);
router.get('/me', protect, auth.me);
router.post('/verify-email', otpLimit, verifyRules, validate, auth.verifyEmail);
router.post('/resend-otp', otpLimit, auth.resendOtp);
router.post('/forgot-password', otpLimit, [body('email').isEmail()], validate, auth.forgotPassword);
router.post('/verify-reset-otp', otpLimit, verifyRules, validate, auth.verifyResetOtp);
router.post('/reset-password', otpLimit, auth.resetPassword);
router.patch('/change-password', protect, auth.changePassword);
router.patch('/profile', protect, [body('name').optional().trim().isLength({ min: 3, max: 120 })], validate, async (req, res, next) => {
  if (req.body.name) { req.user.name = req.body.name; await req.user.save(); }
  res.json({ success: true, data: req.user });
});

module.exports = router;
