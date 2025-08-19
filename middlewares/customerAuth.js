// middleware/customerAuth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { Customer, Stakeholder, Person } = require('../models');

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token has required scope
    if (!decoded.scope || !decoded.scope.includes('read:accounts')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Verify customer exists and is active
    const customer = await Customer.findOne({
      where: {
        id: decoded.customerId,
        active: true,
      },
      include: [
        {
          model: Stakeholder,
          include: [
            {
              model: Person,
              where: {
                id: decoded.personId,
                isVerified: true,
              },
            },
          ],
        },
      ],
    });

    if (!customer) {
      return res.status(401).json({ message: 'Invalid customer' });
    }

    // Attach customer to request
    req.customer = customer;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized: ' + err.message });
  }
};
