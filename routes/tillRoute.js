const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const { allowRoles } = require('../middlewares/roleMiddleware');
const tillController = require('../controllers/till');
const { Till } = require('../models');

router.get(
  '/today',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Till),
  tillController.getTodayTills
);
router.get(
  '/money-types',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Till),
  tillController.getMoneyTypes
);
router.get(
  '/debug',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Till),
  tillController.debugTillTransactions
);
router.post(
  '/forceUpdate',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Till),
  tillController.forceUpdateTill
);

router.get(
  '/history',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Till),
  tillController.getTillHistory
);

router.post(
  '/close',
  protect,
  allowRoles(2, 3),
  orgScope(Till),
  tillController.closeTill
);

router.post(
  '/update-totals',
  protect,
  allowRoles(2, 3),
  orgScope(Till),
  tillController.updateTillTotals
);

// router.put('/update-totals', tillController.updateTillTotals);
// router.post('/close', tillController.closeTill); // Single money type
// router.post('/close-all', tillController.closeAllTills); // All money types
// router.post(
//   '/reopen',
//   authorize(['admin', 'manager']),
//   tillController.reopenTill
// );

module.exports = router;
