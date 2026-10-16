const mongoose = require('mongoose');
const User = require('../models/user.model');
const { verifyToken } = require('../services/token.service');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function rejectAuth(req, reason, message) {
  logger.warn(`Authentication failed: ${reason}`, {
    event: 'auth',
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });
  return ApiError.unauthorized(message);
}

/**
 * Protects routes with a JWT sent as `Authorization: Bearer <token>`.
 * On success `req.user` holds the authenticated user's identity, taken from the verified
 * token and confirmed against the database - never from client-supplied fields.
 */
async function authenticate(req, res, next) {
  const header = req.get('Authorization');
  if (!header || !header.trim()) {
    throw rejectAuth(req, 'missing token', 'Access denied. No token provided. Send the header: Authorization: Bearer <token>');
  }

  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw rejectAuth(req, 'malformed authorization header', 'Invalid authorization header format. Expected: Bearer <token>');
  }

  let payload;
  try {
    payload = verifyToken(parts[1]);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw rejectAuth(req, 'expired token', 'Token has expired. Please log in again.');
    }
    throw rejectAuth(req, 'invalid token', 'Invalid token');
  }

  if (!payload.sub || !mongoose.isValidObjectId(payload.sub)) {
    throw rejectAuth(req, 'token without a valid subject', 'Invalid token');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw rejectAuth(req, 'user no longer exists', 'The user associated with this token no longer exists');
  }

  req.user = { id: String(user._id), username: user.username, email: user.email };
  return next();
}

module.exports = authenticate;
