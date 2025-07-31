const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');

const branchController = require('../controllers/branch');
const { Place } = require('../models');

const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(Place), branchController.getBranches);
router.post('/', protect, allowRoles(2, 3), orgScope(Place), branchController.createBranch);
router.get('/:id', protect, allowRoles(2, 3, 4), orgScope(Place), branchController.getBranchById);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Place), branchController.updateBranch);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(Place), branchController.deleteBranch);

module.exports = router;
