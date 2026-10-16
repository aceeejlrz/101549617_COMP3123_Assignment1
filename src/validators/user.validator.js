const { body, checkExact } = require('express-validator');
const { USERNAME_REGEX } = require('../utils/patterns');

const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password.
const PASSWORD_MAX_BYTES = 72;

const isMissing = (value) => value === undefined || value === null || value === '';

// Rejects any body field that is not validated by the chains before it.
const noUnknownFields = () => checkExact([], { locations: ['body'], message: 'Unknown field(s) in request body' });

const username = () =>
  body('username')
    .exists({ values: 'null' })
    .withMessage('Username is required')
    .bail()
    .isString()
    .withMessage('Username must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .bail()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .bail()
    .matches(USERNAME_REGEX)
    .withMessage('Username may only contain letters, numbers, underscores, dots and hyphens')
    .toLowerCase();

const email = () =>
  body('email')
    .exists({ values: 'null' })
    .withMessage('Email is required')
    .bail()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .bail()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .toLowerCase();

const newPassword = () =>
  body('password')
    .exists({ values: 'null' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES)
    .withMessage(`Password must not exceed ${PASSWORD_MAX_BYTES} bytes`)
    .bail()
    .isStrongPassword({ minLength: PASSWORD_MIN_LENGTH, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character');

// POST /api/v1/user/signup
const signupRules = [username(), email(), newPassword(), noUnknownFields()];

// POST /api/v1/user/login - username + password OR email + password
const loginRules = [
  body('username')
    .custom((value, { req }) => !isMissing(value) || !isMissing(req.body && req.body.email))
    .withMessage('Username or email is required'),
  body('username')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Username must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .bail()
    .isLength({ max: 30 })
    .withMessage('Username must not exceed 30 characters')
    .toLowerCase(),
  body('email')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .bail()
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .bail()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .toLowerCase(),
  body('password')
    .exists({ values: 'null' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ max: 128 })
    .withMessage('Password must not exceed 128 characters'),
  noUnknownFields(),
];

module.exports = { signupRules, loginRules };
