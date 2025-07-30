const express = require("express");
const { protect } = require("../middlewares/authMiddlewares");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();


router.use(protect);

router.get("/",allowRoles(2,3))