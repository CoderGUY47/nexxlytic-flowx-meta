// auth.js
const express = require('express');
const router = express.Router();
const { signup, login, getProfile, updateProfile, regenerateApiKey } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.post('/regenerate-key', auth, regenerateApiKey);

module.exports = router;
