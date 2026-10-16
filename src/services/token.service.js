const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'comp3123-assignment1-api';

/**
 * Creates a signed JWT for the user. The user's id is stored in the standard `sub` claim
 * and is the ONLY identity the API trusts for ownership checks.
 */
function signToken(user) {
  const token = jwt.sign({ username: user.username }, env.jwtSecret, {
    subject: String(user._id),
    expiresIn: env.jwtExpiresIn,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * Verifies signature, algorithm, issuer and expiry.
 * Throws TokenExpiredError / JsonWebTokenError when the token is not valid.
 */
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
  });
}

module.exports = { signToken, verifyToken, JWT_ALGORITHM, JWT_ISSUER };
