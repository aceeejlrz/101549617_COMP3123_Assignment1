const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Convert express-validator errors to { field, location, message }.
// Submitted values are deliberately left out so passwords are never echoed or logged.
function formatErrors(result) {
  return result.array({ onlyFirstError: true }).flatMap((error) => {
    if (error.type === 'unknown_fields') {
      return error.fields.map((field) => ({
        field: field.path,
        location: field.location,
        message: `Unknown field '${field.path}' is not allowed`,
      }));
    }
    if (error.type === 'field') {
      return [{ field: error.path, location: error.location, message: error.msg }];
    }
    return [{ message: error.msg }];
  });
}

// Logs the failure and builds the 400 error passed to the central error handler.
function validationFailure(req, errors) {
  logger.warn('Validation failed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user ? req.user.id : undefined,
    errors: errors.map(({ field, message }) => ({ field, message })),
  });
  return ApiError.badRequest('Validation failed', errors);
}

// Runs after the validation chains of a route and stops the request if any failed.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(validationFailure(req, formatErrors(result)));
}

module.exports = { validate, validationFailure };
