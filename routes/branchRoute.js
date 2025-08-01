const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const { Branch } = require('../models');
const branchController = require('../controllers/branch');

const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(Branch), branchController.getBranches);
router.get('/:id', protect, allowRoles(2, 3, 4), orgScope(Branch), branchController.getBranchById);
router.post('/', protect, allowRoles(2, 3), orgScope(Branch), branchController.createBranch);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Branch), branchController.updateBranch);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(Branch), branchController.deleteBranch);

module.exports = router;


