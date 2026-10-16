const { matchedData } = require('express-validator');
const userService = require('../services/user.service');
const { signToken } = require('../services/token.service');
const env = require('../config/env');
const logger = require('../utils/logger');

// POST /api/v1/user/signup
async function signup(req, res) {
  const { username, email, password } = matchedData(req, { locations: ['body'] });

  try {
    const user = await userService.registerUser({ username, email, password });
    logger.info('User signup successful', { event: 'signup', userId: user.id, username: user.username });

    res.status(201).json({
      status: true,
      message: 'User created successfully.',
      user_id: user.id,
      user: user.toJSON(),
    });
  } catch (err) {
    if (err.statusCode === 409) {
      logger.warn('User signup rejected: duplicate user', { event: 'signup', username, reason: err.message });
    }
    throw err;
  }
}

// POST /api/v1/user/login
async function login(req, res) {
  const { username, email, password } = matchedData(req, { locations: ['body'] });
  const identifier = username || email;

  try {
    const user = await userService.authenticateUser({ username, email, password });
    const { token, expiresAt } = signToken(user);
    logger.info('Login successful', { event: 'login', userId: user.id, identifier, ip: req.ip });

    res.status(200).json({
      status: true,
      message: 'Login successful.',
      jwt_token: token,
      token_type: 'Bearer',
      expires_in: env.jwtExpiresIn,
      expires_at: expiresAt,
      user: user.toJSON(),
    });
  } catch (err) {
    if (err.statusCode === 401) {
      logger.warn('Login failed: invalid credentials', { event: 'login', identifier, ip: req.ip });
    }
    throw err;
  }
}

module.exports = { signup, login };
