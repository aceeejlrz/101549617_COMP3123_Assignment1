const logger = require('../utils/logger');

/**
 * Logs one line per request after the response is sent:
 * timestamp (added by winston), method, path, status, duration, client IP and user ID.
 * Request bodies and headers are never logged, so passwords and tokens stay out of the logs.
 */
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const { statusCode } = res;

    let level = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warn';

    logger.log(level, `${req.method} ${req.originalUrl} ${statusCode}`, {
      type: 'request',
      method: req.method,
      path: req.originalUrl,
      status: statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      ip: req.ip,
      userId: req.user ? req.user.id : undefined,
    });
  });

  next();
}

module.exports = requestLogger;
