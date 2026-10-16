const path = require('path');
const dotenv = require('dotenv');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

// Fail fast when required secrets are missing instead of starting an insecure server.
const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET'];
const missing = REQUIRED_VARS.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env and provide the values.'
  );
}

if (process.env.JWT_SECRET.trim().length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long. Use a long random value.');
}

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// jsonwebtoken treats a numeric *string* as milliseconds, so convert plain numbers to seconds.
const parseExpiresIn = (value) => {
  if (!value || !value.trim()) return '1h';
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
};

const parseTrustProxy = (value) => {
  if (value === undefined || value.trim() === '' || value.trim().toLowerCase() === 'false') return false;
  if (value.trim().toLowerCase() === 'true') return true;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value.trim();
};

const parseCorsOrigin = (value) => {
  if (!value || value.trim() === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = Object.freeze({
  rootDir: ROOT_DIR,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: toPositiveInt(process.env.PORT, 3000),

  mongodbUri: process.env.MONGODB_URI.trim(),
  // The assignment requires this exact database name.
  dbName: 'comp3123_assignment1',

  jwtSecret: process.env.JWT_SECRET.trim(),
  jwtExpiresIn: parseExpiresIn(process.env.JWT_EXPIRES_IN),
  bcryptSaltRounds: Math.min(Math.max(toPositiveInt(process.env.BCRYPT_SALT_ROUNDS, 12), 10), 15),

  rateLimit: {
    windowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toPositiveInt(process.env.RATE_LIMIT_MAX, 300),
    authWindowMs: toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    loginMax: toPositiveInt(process.env.LOGIN_RATE_LIMIT_MAX, 5),
    signupMax: toPositiveInt(process.env.SIGNUP_RATE_LIMIT_MAX, 20),
  },

  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),

  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: path.resolve(ROOT_DIR, process.env.LOG_DIR || 'logs'),
});
