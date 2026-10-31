/**
 * CampusNexus — Student AI Chatbot Routes
 * Guarded by JWT authentication and student role authorization.
 */

const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const chatbot = require('../controllers/chatbot.controller');

const router = express.Router();

// Strict security: all chatbot endpoints require authenticated student session
router.use(protect, requireRole('student'));

router.post('/', chatbot.chat);
router.post('/chat', chatbot.chat);
router.get('/overview', chatbot.getOverview);
router.get('/history', chatbot.getHistory);
router.delete('/history', chatbot.clearHistory);

module.exports = router;
