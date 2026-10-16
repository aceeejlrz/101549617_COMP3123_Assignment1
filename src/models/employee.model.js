const mongoose = require('mongoose');
const { EMAIL_REGEX, PERSON_NAME_REGEX } = require('../utils/patterns');

const employeeSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name must not exceed 50 characters'],
      match: [PERSON_NAME_REGEX, 'First name contains invalid characters'],
    },
    last_name: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name must not exceed 50 characters'],
      match: [PERSON_NAME_REGEX, 'Last name contains invalid characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must not exceed 254 characters'],
      match: [EMAIL_REGEX, 'Email must be a valid email address'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      maxlength: [100, 'Position must not exceed 100 characters'],
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      validate: {
        validator: (value) => Number.isFinite(value) && value > 0,
        message: 'Salary must be a positive number',
      },
    },
    date_of_joining: {
      type: Date,
      required: [true, 'Date of joining is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department must not exceed 100 characters'],
    },
    // Owner of this employee record (the authenticated user who created it).
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee owner is required'],
      immutable: true,
      validate: {
        validator: async (userId) => Boolean(await mongoose.model('User').exists({ _id: userId })),
        message: 'Employee owner must reference an existing user',
      },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Supports "list my employees" queries and prevents one user from storing the same
// employee email twice. Different users may each have an employee with the same email.
employeeSchema.index({ user: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
