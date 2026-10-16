const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { EMAIL_REGEX, USERNAME_REGEX } = require('../utils/patterns');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
      match: [USERNAME_REGEX, 'Username may only contain letters, numbers, underscores, dots and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must not exceed 254 characters'],
      match: [EMAIL_REGEX, 'Email must be a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // Never returned by queries unless explicitly requested with .select('+password').
      select: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
    toJSON: {
      // Never expose the password hash in API responses.
      transform(doc, ret) {
        const { _id, password, ...rest } = ret;
        return { _id, ...rest };
      },
    },
  }
);

// Hash the password before it is stored. Plain-text passwords never reach MongoDB.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptSaltRounds);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
