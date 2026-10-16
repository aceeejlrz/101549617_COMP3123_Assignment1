const { body, param, query, checkExact } = require('express-validator');
const { PERSON_NAME_REGEX } = require('../utils/patterns');
const { validationFailure } = require('../middleware/validate');

const EMPLOYEE_FIELDS = ['first_name', 'last_name', 'email', 'position', 'salary', 'date_of_joining', 'department'];
const MAX_SALARY = 1000000000;
const MIN_JOINING_DATE = new Date('1900-01-01T00:00:00.000Z');
const MAX_JOINING_DATE = new Date('2100-12-31T23:59:59.999Z');

const isNumericValue = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim()));

// Starts a body chain that is either required (create) or optional (update).
// Optional fields may be omitted, but if present they must be valid (null is rejected).
const field = (name, label, isOptional) => {
  const chain = body(name);
  if (isOptional) return chain.optional();
  return chain.exists({ values: 'null' }).withMessage(`${label} is required`).bail();
};

const textField = (name, label, isOptional, { min = 1, max }) =>
  field(name, label, isOptional)
    .isString()
    .withMessage(`${label} must be a string`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${label} cannot be empty`)
    .bail()
    .isLength({ min, max })
    .withMessage(`${label} must be between ${min} and ${max} characters`);

const personNameField = (name, label, isOptional) =>
  textField(name, label, isOptional, { max: 50 })
    .bail()
    .matches(PERSON_NAME_REGEX)
    .withMessage(`${label} may only contain letters, spaces, apostrophes, periods and hyphens`);

const employeeFieldRules = (isOptional) => [
  personNameField('first_name', 'First name', isOptional),
  personNameField('last_name', 'Last name', isOptional),
  field('email', 'Email', isOptional)
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
  textField('position', 'Position', isOptional, { min: 2, max: 100 }),
  textField('department', 'Department', isOptional, { min: 2, max: 100 }),
  field('salary', 'Salary', isOptional)
    .custom(isNumericValue)
    .withMessage('Salary must be a number')
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage('Salary must be a positive number')
    .bail()
    .custom((value) => Number(value) <= MAX_SALARY)
    .withMessage(`Salary must not exceed ${MAX_SALARY}`)
    .customSanitizer((value) => Number(value)),
  field('date_of_joining', 'Date of joining', isOptional)
    .isString()
    .withMessage('Date of joining must be a date string such as 2024-03-15')
    .bail()
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Date of joining must be a valid date in ISO 8601 format (YYYY-MM-DD)')
    .bail()
    .custom((value) => {
      const date = new Date(value);
      return date >= MIN_JOINING_DATE && date <= MAX_JOINING_DATE;
    })
    .withMessage('Date of joining must be between 1900-01-01 and 2100-12-31')
    .toDate(),
];

// The owner (`user`) and other fields such as `_id` are not accepted from the client.
const noUnknownBodyFields = () =>
  checkExact([], { locations: ['body'], message: 'Unknown field(s) in request body' });

const employeeIdParam = () =>
  param('eid').isMongoId().withMessage('Invalid employee ID. It must be a valid MongoDB ObjectId');

// PUT must change at least one employee field.
function requireUpdateField(req, res, next) {
  const bodyFields = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
  if (!EMPLOYEE_FIELDS.some((name) => bodyFields.includes(name))) {
    return next(
      validationFailure(req, [
        {
          field: 'body',
          location: 'body',
          message: `Provide at least one field to update: ${EMPLOYEE_FIELDS.join(', ')}`,
        },
      ])
    );
  }
  return next();
}

// POST /api/v1/emp/employees
const createEmployeeRules = [...employeeFieldRules(false), noUnknownBodyFields()];

// GET /api/v1/emp/employees/:eid
const getEmployeeRules = [employeeIdParam()];

// PUT /api/v1/emp/employees/:eid
const updateEmployeeRules = [employeeIdParam(), ...employeeFieldRules(true), noUnknownBodyFields()];

// DELETE /api/v1/emp/employees?eid=xxx
const deleteEmployeeRules = [
  query('eid')
    .exists({ values: 'falsy' })
    .withMessage('Employee ID is required as a query parameter: ?eid=<employee id>')
    .bail()
    .isString()
    .withMessage('Provide a single employee ID')
    .bail()
    .isMongoId()
    .withMessage('Invalid employee ID. It must be a valid MongoDB ObjectId'),
];

module.exports = {
  EMPLOYEE_FIELDS,
  createEmployeeRules,
  getEmployeeRules,
  updateEmployeeRules,
  deleteEmployeeRules,
  requireUpdateField,
};
