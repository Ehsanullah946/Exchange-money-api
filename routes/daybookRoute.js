const express = require('express');
const router = express.Router();
const dayBookController = require('../controllers/daybook');
const orgScope = require('../middlewares/orgScope');
const { allowRoles } = require('../middlewares/roleMiddleware');
const { protect } = require('../middlewares/authMiddlewares');

router.get(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(),
  dayBookController.getDayBook
);

module.exports = router;
