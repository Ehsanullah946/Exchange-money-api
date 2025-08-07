const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middlewares/protectCustomer');

// Example protected route
router.get('/my-account', protectCustomer, async (req, res) => {
  try {
    res.status(200).json({
      message: 'Customer data loaded',
      data: req.customer
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching account',err });
  }
});

module.exports = router;
