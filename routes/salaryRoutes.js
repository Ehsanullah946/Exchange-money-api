const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const salaryController = require('../controllers/salary');
const { Salary } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/employees',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Salary),
  salaryController.getEmployeesForSalary
);

router.get(
  '/summary',
  protect,
  allowRoles(2, 3),
  orgScope(Salary),
  salaryController.getSalarySummary
);

router.get(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Salary),
  salaryController.getSalaries
);

router.post(
  '/:employeeId',
  protect,
  allowRoles(2, 3),
  orgScope(Salary),
  salaryController.createSalary
);

router.put(
  '/:slaryId',
  protect,
  allowRoles(2, 3),
  orgScope(Salary),
  salaryController.updateSalary
);

router.patch(
  '/:slaryId/pay',
  protect,
  allowRoles(2, 3),
  orgScope(Salary),
  salaryController.markAsPaid
);

module.exports = router;
