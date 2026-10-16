const express = require('express');
const { signup, login } = require('../controllers/user.controller');
const { signupRules, loginRules } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');
const { signupLimiter, loginLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// The rate limiter runs first so that invalid requests also count towards the limit.
router.post('/signup', signupLimiter, signupRules, validate, signup);
router.post('/login', loginLimiter, loginRules, validate, login);

module.exports = router;
