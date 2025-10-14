const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const receiveController = require('../controllers/receive');
const { Receive } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Receive),
  receiveController.getAllReceive
);
router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.createReceive
);

router.post(
  '/:id/sender',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.updateReceiveSender
);
router.post(
  '/:id/receiver',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.updateReceiveReceiver
);

router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.updateReceive
);

router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.deleteReceive
);

router.patch(
  '/:id/reject',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.rejectReceive
);

router.get(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Receive),
  receiveController.getReceiveById
);

module.exports = router;
