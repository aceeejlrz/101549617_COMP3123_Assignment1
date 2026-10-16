const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const { apiLimiter } = require('./middleware/rateLimiters');
const healthRoutes = require('./routes/health.routes');
const userRoutes = require('./routes/user.routes');
const employeeRoutes = require('./routes/employee.routes');

const app = express();

app.set('trust proxy', env.trustProxy);

// Security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, ...) and hides X-Powered-By.
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));

app.use(requestLogger);

// Parse JSON bodies; small limit to reduce abuse. Malformed JSON is handled by the error handler.
app.use(express.json({ limit: '10kb' }));

// Request bodies must be JSON objects (not arrays or primitives).
app.use((req, res, next) => {
  if (req.body !== undefined && (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return next(ApiError.badRequest('Request body must be a JSON object'));
  }
  return next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: true,
    message: 'COMP3123 Assignment 1 API',
    health: '/health',
    endpoints: {
      user: '/api/v1/user',
      employees: '/api/v1/emp/employees',
    },
  });
});

app.use('/health', healthRoutes);

// General rate limit for all API routes (auth routes also have stricter limits).
app.use('/api', apiLimiter);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/emp', employeeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
