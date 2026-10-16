const { matchedData } = require('express-validator');
const employeeService = require('../services/employee.service');
const logger = require('../utils/logger');

// Only fields that passed validation are used (unknown fields were already rejected).
const validatedBody = (req) => matchedData(req, { locations: ['body'] });

// GET /api/v1/emp/employees
async function listEmployees(req, res) {
  const employees = await employeeService.listEmployees(req.user.id);
  res.status(200).json({
    status: true,
    count: employees.length,
    employees,
  });
}

// POST /api/v1/emp/employees
async function createEmployee(req, res) {
  const employee = await employeeService.createEmployee(req.user.id, validatedBody(req));
  logger.info('Employee created', { event: 'employee.create', userId: req.user.id, employeeId: employee.id });

  res.status(201).json({
    status: true,
    message: 'Employee created successfully.',
    employee_id: employee.id,
    employee,
  });
}

// GET /api/v1/emp/employees/:eid
async function getEmployee(req, res) {
  const employee = await employeeService.getEmployee(req.user.id, req.params.eid);
  res.status(200).json({ status: true, employee });
}

// PUT /api/v1/emp/employees/:eid
async function updateEmployee(req, res) {
  const employee = await employeeService.updateEmployee(req.user.id, req.params.eid, validatedBody(req));
  logger.info('Employee updated', { event: 'employee.update', userId: req.user.id, employeeId: employee.id });

  res.status(200).json({
    status: true,
    message: 'Employee details updated successfully.',
    employee,
  });
}

// DELETE /api/v1/emp/employees?eid=xxx
async function deleteEmployee(req, res) {
  const { eid } = matchedData(req, { locations: ['query'] });
  await employeeService.deleteEmployee(req.user.id, eid);
  logger.info('Employee deleted', { event: 'employee.delete', userId: req.user.id, employeeId: eid });

  res.status(204).end();
}

module.exports = {
  listEmployees,
  createEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
};
