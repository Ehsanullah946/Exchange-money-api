const express = require("express");
const router = express.Router();
const { protect } = require('../middlewares/authMiddlewares');
const customerController = require("../controllers/customer");
const { allowRoles } = require("../middlewares/roleMiddleware");


router.use(protect);

router.get('/', allowRoles(2, 3), customerController.findAll);
router.post('/', allowRoles(2, 3), customerController.create);

module.exports = router;