const jwt = require('jsonwebtoken');
const { Customer } = require('../models');

exports.protectCustomer = async (req, res, next) => {
  let token;

  // Get token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customer = await Customer.findByPk(decoded.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    req.customer = customer;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', err });
  }
};
