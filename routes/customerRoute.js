const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const customerController = require('../controllers/customer');
const { Customer } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Customer),
  customerController.getCustomers
);
router.get(
  '/:customerId/account',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Customer),
  customerController.getCustomerAccounts
);
router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.createCustomer
);
router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.updateCustomer
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.deleteCustomer
);
router.get(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.getCustomerById
);

// router.get("/accounts", protectCustomer, async (req, res) => {
//   try {
//     // Verify the requested accounts belong to the authenticated customer
//     const accounts = await Account.findAll({
//       where: {
//         customerId: req.customerId,
//         // Add organization verification if accounts are org-scoped
//       },
//       include: [
//         {
//           model: MoneyType,
//         }
//       ]
//     });

//     if (!accounts || accounts.length === 0) {
//       return res.status(404).json({ message: 'No accounts found for this customer' });
//     }

//     res.status(200).json(accounts);
//   } catch (err) {
//     res.status(500).json({
//       message: 'Failed to fetch accounts',
//       error: process.env.NODE_ENV === 'development' ? err.message : null
//     });
//   }
// });

module.exports = router;
