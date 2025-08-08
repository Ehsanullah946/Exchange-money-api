const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');

const orgScope = require('../middlewares/orgScope');
const customerController = require('../controllers/customer');
const { Customer } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');
const { protectCustomer } = require('../middlewares/protectCustomer');
const { Account } = require("../models");
const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(Customer), customerController.getCustomers);
router.post('/', protect, allowRoles(2, 3), orgScope(Customer), customerController.createCustomer);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Customer), customerController.updateCustomer);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(Customer), customerController.deleteCustomer);
router.get('/:id', protect, allowRoles(2, 3), orgScope(Customer), customerController.getCustomerById);


router.get("/accounts", protectCustomer, async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: { customerId: req.customerId },
      include: [/* add other related models if needed */]
    });
    res.status(200).json(accounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
