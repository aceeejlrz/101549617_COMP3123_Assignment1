const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Maps any error to a consistent JSON response:
 *   { "status": false, "message": "...", "errors": [ ... ] }
 * Stack traces and internal details are logged, never sent to the client.
 */
function toHttpError(err) {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }

  // Errors raised by express.json() (body-parser)
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Malformed JSON in request body' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large' };
  }
  if (err.type === 'encoding.unsupported' || err.type === 'charset.unsupported') {
    return { statusCode: 415, message: 'Unsupported request body encoding' };
  }

  // Mongoose schema validation failed
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        location: 'body',
        message: e.kind === 'ObjectId' || e.name === 'CastError' ? `Invalid value for ${e.path}` : e.message,
      })),
    };
  }

  // Invalid ObjectId or type passed to a query
  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, message: `Invalid value for ${err.path}` };
  }

  // Unique index violation (e.g. a concurrent duplicate signup)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || err.keyPattern || {}).filter((key) => key !== 'user');
    return {
      statusCode: 409,
      message: fields.length > 0 ? `A record with this ${fields.join(' and ')} already exists` : 'Duplicate value',
    };
  }

  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token has expired. Please log in again.' };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Invalid token' };
  }

  return { statusCode: 500, message: 'Internal server error' };
}

// Express identifies error handlers by their four parameters, so `next` must stay in the signature.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const { statusCode, message, errors } = toHttpError(err);

  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      method: req.method,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn(`Request rejected: ${message}`, {
      method: req.method,
      path: req.originalUrl,
      status: statusCode,
      userId: req.user ? req.user.id : undefined,
    });
  }

  const body = { status: false, message };
  if (errors && errors.length > 0) body.errors = errors;

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
