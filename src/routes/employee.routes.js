const express = require('express');
const authenticate = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const employeeController = require('../controllers/employee.controller');
const {
  createEmployeeRules,
  getEmployeeRules,
  updateEmployeeRules,
  deleteEmployeeRules,
  requireUpdateField,
} = require('../validators/employee.validator');

const router = express.Router();

// Every employee route requires a valid JWT. Authentication runs before validation
// so unauthenticated requests always receive 401.
router
  .route('/employees')
  .all(authenticate)
  .get(employeeController.listEmployees)
  .post(createEmployeeRules, validate, employeeController.createEmployee)
  .delete(deleteEmployeeRules, validate, employeeController.deleteEmployee);

router
  .route('/employees/:eid')
  .all(authenticate)
  .get(getEmployeeRules, validate, employeeController.getEmployee)
  .put(updateEmployeeRules, validate, requireUpdateField, employeeController.updateEmployee);

module.exports = router;
