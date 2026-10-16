/**
 * Prints a JWT that is correctly signed with JWT_SECRET but already expired, so the
 * "expired token" case can be tested in Postman without waiting for a real token to expire.
 *
 * Usage: npm run token:expired
 * Then send it as: Authorization: Bearer <printed token>
 * Expected response: 401 { "status": false, "message": "Token has expired. Please log in again." }
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const { JWT_ALGORITHM, JWT_ISSUER } = require('../src/services/token.service');

const now = Math.floor(Date.now() / 1000);

const token = jwt.sign(
  {
    sub: crypto.randomBytes(12).toString('hex'),
    username: 'expired_token_demo',
    iat: now - 2 * 60 * 60,
    exp: now - 60 * 60,
  },
  env.jwtSecret,
  { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER }
);

console.log(token);
