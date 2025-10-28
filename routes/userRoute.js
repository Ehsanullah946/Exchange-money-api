const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddlewares');
const {
  allowRoles,
  requireOrganizationAccess,
} = require('../middlewares/roleMiddleware');
const { UserAccount } = require('../models');

// Get all users in organization
router.get(
  '/organization/:organizationId',
  protect,
  allowRoles(2), // Only organization admin
  requireOrganizationAccess(),
  async (req, res) => {
    try {
      const { organizationId } = req.params;

      // Verify the admin belongs to this organization
      if (parseInt(organizationId) !== req.user.organizationId) {
        return res
          .status(403)
          .json({ message: 'Access denied to this organization' });
      }

      const users = await UserAccount.findAll({
        where: { organizationId },
        attributes: { exclude: ['password'] }, // Don't return passwords
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
