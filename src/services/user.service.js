const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');

// Used when no user matches, so a failed login takes about as long whether or not the
// username/email exists (reduces user enumeration through response timing).
let dummyHash;
const getDummyHash = async () => {
  if (!dummyHash) dummyHash = await bcrypt.hash('dummy-password-for-timing', env.bcryptSaltRounds);
  return dummyHash;
};

async function registerUser({ username, email, password }) {
  const existing = await User.findOne({ $or: [{ username }, { email }] }).lean();
  if (existing) {
    throw ApiError.conflict(
      existing.username === username ? 'Username is already taken' : 'Email is already registered'
    );
  }

  // The password is hashed by the User model's pre-save hook.
  return User.create({ username, email, password });
}

/**
 * Finds the user by username and/or email and checks the password.
 * Returns the same error for "no such user" and "wrong password".
 */
async function authenticateUser({ username, email, password }) {
  const filter = {};
  if (username) filter.username = username;
  if (email) filter.email = email;

  const user = await User.findOne(filter).select('+password');
  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    throw ApiError.unauthorized('Invalid username/email or password');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid username/email or password');
  }

  return user;
}

module.exports = { registerUser, authenticateUser };
