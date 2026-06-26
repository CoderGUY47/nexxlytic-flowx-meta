// messages.js
const express = require('express');
const { flexAuth } = require('../middleware/auth');
const { sendMessage, getMessages } = require('../services/messagingService');
const router = express.Router();
router.use(flexAuth);
router.post('/send', sendMessage);
router.get('/', getMessages);
module.exports = router;
