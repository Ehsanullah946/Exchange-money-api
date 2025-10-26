const express = require('express');
const router = express.Router();
const { UserAccount } = require('../models');
const { protect } = require('../middlewares/authMiddlewares');
const {
  allowRoles,
  requireOrganizationAccess,
} = require('../middlewares/roleMiddleware');
const {
  createOrganization,
  addUserToOrganization,
  login,
  logout,
} = require('../controllers/authController');

// Super admin only - create organization
router.post(
  '/create-organization',
  protect,
  allowRoles(1), // Only super admin (role 1)
  createOrganization
);

router.post(
  '/add-user',
  protect,
  allowRoles(2), // Organization admin
  requireOrganizationAccess(),
  addUserToOrganization
);

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
        order: [['createdAt', 'DESC']],
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Public routes
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
