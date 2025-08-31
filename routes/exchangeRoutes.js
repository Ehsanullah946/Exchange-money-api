const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const exchangeController = require('../controllers/exchange');
const { Exchange } = require('../models');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Exchange),
  exchangeController.getExchanges
);
router.get(
  '/:id',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Exchange),
  exchangeController.getExchangeById
);
router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Exchange),
  exchangeController.createExchange
);
router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Exchange),
  exchangeController.updateExchange
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Exchange),
  exchangeController.deleteExchange
);

module.exports = router;
