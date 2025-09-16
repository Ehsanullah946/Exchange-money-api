const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const {
  createOrganization,
  addUserToOrganization,
  login,
  logout,
} = require('../controllers/authController');

// Super Admin creates organization + first admin
router.post(
  '/create-organization',
  protect,
  (req, res, next) => {
    console.log(req.user); // Check role here
    next();
  },
  allowRoles(1),
  createOrganization
);

// Organization Admin adds a user to their org
router.post('/add-user', protect, allowRoles(2), addUserToOrganization);

// router.post('/customer-login' , customerLogin);

// Login
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
