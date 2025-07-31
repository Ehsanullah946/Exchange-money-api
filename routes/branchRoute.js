const express = require("express");
const { protect } = require("../middlewares/authMiddlewares");
const orgScope = require("../middlewares/orgScope");
const { allowRoles } = require("../middlewares/roleMiddleware");
const branchController = require("../controllers/branch");
const { Branch } = require("../models");

const router = express.Router();

router.get("/", protect, allowRoles(2, 3, 4), orgScope(Branch), branchController.getBranches);
router.post("/", protect, allowRoles(2, 3), orgScope(Branch), branchController.createBranch);
router.patch("/:id", protect, allowRoles(2, 3), orgScope(Branch), branchController.updateBranch);
router.delete("/:id", protect, allowRoles(2, 3), orgScope(Branch), branchController.deleteBranch);

module.exports = router;
