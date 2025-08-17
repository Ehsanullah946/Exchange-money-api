const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const { allowRoles } = require('../middlewares/roleMiddleware');
const rateController = require('../controllers/rate');
const { Rate } = require('../models');

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Rate),
  rateController.getRates
);
router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.createOrUpdateRate
);
router.put(
  '/:fromCurrency',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.createOrUpdateRate
);
router.get(
  '/latest',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.getLatestRates
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.deleteRate
);
router.get(
  '/:fromCurrency',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.getRateByCurrency
);

module.exports = router;
