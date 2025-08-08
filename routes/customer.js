// const express = require('express');
// const router = express.Router();
// const { protectCustomer } = require('../middlewares/protectCustomer');
// const { Account } = require("../models");

// // Example protected route
// router.get("/accounts", protectCustomer, async (req, res) => {
//   try {
//     const accounts = await Account.findAll({
//       where: { customerId: req.customerId },
//       include: [/* add other related models if needed */]
//     });
//     res.status(200).json(accounts);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });
// module.exports = router;
