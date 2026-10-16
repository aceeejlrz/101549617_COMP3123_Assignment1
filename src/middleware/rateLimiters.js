const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');
const logger = require('../utils/logger');

const minutes = (ms) => Math.max(1, Math.ceil(ms / 60000));

/**
 * Builds a limiter that counts requests per client IP in a fixed time window.
 * Once the limit is reached the client receives 429 Too Many Requests (JSON) until the
 * window resets. RateLimit-* and Retry-After headers tell the client when to retry.
 */
function createLimiter({ name, windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded: ${name}`, {
        limiter: name,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        limit,
        windowMs,
      });
      res.status(options.statusCode).json({ status: false, message });
    },
  });
}

// General limit for every /api route.
const apiLimiter = createLimiter({
  name: 'api',
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  message: `Too many requests from this IP. Please try again after ${minutes(env.rateLimit.windowMs)} minute(s).`,
});

// Brute-force protection: only FAILED login attempts count towards the limit.
const loginLimiter = createLimiter({
  name: 'login',
  windowMs: env.rateLimit.authWindowMs,
  limit: env.rateLimit.loginMax,
  skipSuccessfulRequests: true,
  message: `Too many failed login attempts from this IP. Please try again after ${minutes(env.rateLimit.authWindowMs)} minute(s).`,
});

// Limits automated account creation.
const signupLimiter = createLimiter({
  name: 'signup',
  windowMs: env.rateLimit.authWindowMs,
  limit: env.rateLimit.signupMax,
  message: `Too many signup attempts from this IP. Please try again after ${minutes(env.rateLimit.authWindowMs)} minute(s).`,
});

module.exports = { apiLimiter, loginLimiter, signupLimiter };
