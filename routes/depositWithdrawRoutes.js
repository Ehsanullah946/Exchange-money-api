const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const depositWithdrawController = require('../controllers/depositWithdraw');
const { DepositWithdraw } = require('../models');

const router = express.Router();

router.get(
  '/deposits',
  protect,
  allowRoles(2, 3, 4),
  orgScope(DepositWithdraw),
  depositWithdrawController.getDeposits
);
router.get(
  '/withdraws',
  protect,
  allowRoles(2, 3, 4),
  orgScope(DepositWithdraw),
  depositWithdrawController.getWithdraws
);
// router.get(
//   '/:id',
//   protect,
//   allowRoles(2, 3, 4),
//   orgScope(DepositWithdraw),
//   depositWithdrawController.getDepositWithdraws
// );

router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(DepositWithdraw),
  depositWithdrawController.createDepositWithdraw
);
router.put(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(DepositWithdraw),
  depositWithdrawController.updateDepositWithdraw
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(DepositWithdraw),
  depositWithdrawController.deleteDepositWithdraw
);

module.exports = router;
