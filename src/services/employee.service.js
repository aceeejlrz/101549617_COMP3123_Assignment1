const Employee = require('../models/employee.model');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/*
 * Ownership rule: every query filters by BOTH the employee id and the authenticated
 * user's id ({ _id: employeeId, user: userId }). A user can therefore never read, change
 * or delete an employee owned by someone else, no matter which `eid` is sent.
 */

const DUPLICATE_EMAIL_MESSAGE = 'You already have an employee with this email address';

// Called when an owner-scoped query found nothing: 404 if the employee does not exist,
// 403 if it exists but belongs to another user.
async function rejectInaccessibleEmployee(employeeId, userId, action) {
  const exists = await Employee.exists({ _id: employeeId });
  if (!exists) {
    throw ApiError.notFound('Employee not found');
  }

  logger.warn('Authorization failed: employee belongs to another user', {
    event: 'authorization',
    action,
    userId,
    employeeId,
  });
  throw ApiError.forbidden('Access denied. You do not have permission to access this employee');
}

function listEmployees(userId) {
  return Employee.find({ user: userId }).sort({ created_at: -1 });
}

async function createEmployee(userId, data) {
  if (await Employee.exists({ user: userId, email: data.email })) {
    throw ApiError.conflict(DUPLICATE_EMAIL_MESSAGE);
  }
  // The owner always comes from the verified token, never from the request body.
  return Employee.create({ ...data, user: userId });
}

async function getEmployee(userId, employeeId) {
  const employee = await Employee.findOne({ _id: employeeId, user: userId });
  if (!employee) await rejectInaccessibleEmployee(employeeId, userId, 'read');
  return employee;
}

async function updateEmployee(userId, employeeId, updates) {
  const current = await Employee.findOne({ _id: employeeId, user: userId }).select('email').lean();
  if (!current) await rejectInaccessibleEmployee(employeeId, userId, 'update');

  if (updates.email && updates.email !== current.email) {
    if (await Employee.exists({ user: userId, email: updates.email })) {
      throw ApiError.conflict(DUPLICATE_EMAIL_MESSAGE);
    }
  }

  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, user: userId },
    { $set: updates },
    { new: true, runValidators: true }
  );
  // The employee could have been deleted between the two queries.
  if (!employee) await rejectInaccessibleEmployee(employeeId, userId, 'update');
  return employee;
}

async function deleteEmployee(userId, employeeId) {
  const employee = await Employee.findOneAndDelete({ _id: employeeId, user: userId });
  if (!employee) await rejectInaccessibleEmployee(employeeId, userId, 'delete');
  return employee;
}

module.exports = {
  listEmployees,
  createEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
};
