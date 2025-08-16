const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const expenceController = require('../controllers/expence');
const { Expence } = require('../models');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Expence),
  expenceController.getAllExpence
);

// // router.get(
// //   '/:id',
// //   protect,
// //   allowRoles(2, 3, 4),
// //   orgScope(Expence),
// //   expenceController.getExpences
// // );

router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Expence),
  expenceController.createExpence
);
router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Expence),
  expenceController.updateExpence
);

router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Expence),
  expenceController.deleteExpence
);

module.exports = router;
