const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');

const orgScope = require('../middlewares/orgScope');
const employeeController = require('../controllers/employee');
const { Employee } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(Employee), employeeController.getEmployees);
router.post('/', protect, allowRoles(2, 3), orgScope(Employee), employeeController.createEmployee);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Employee), employeeController.updateEmployee);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(Employee), employeeController.deleteEmployee);
router.get('/:id', protect, allowRoles(2, 3), orgScope(Employee), employeeController.getEmployeeById);

module.exports = router;