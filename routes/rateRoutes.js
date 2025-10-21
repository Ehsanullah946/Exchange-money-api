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
  rateController.createRate
);
router.get(
  '/latest',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Rate),
  rateController.getLatestRates
);
router.post(
  '/convert',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Rate),
  rateController.convertCurrency
);
router.get(
  '/currency/:fromCurrency/:toCurrency',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Rate),
  rateController.getCurrentRateByCurrency
);
router.get(
  '/:id',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Rate),
  rateController.getRateById
);
router.put(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.updateRate
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Rate),
  rateController.deleteRate
);

module.exports = router;
