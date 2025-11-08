// middlewares/customerAuth.js - Updated to include organizationId
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { Customer, Stakeholder, Person } = require('../models');

module.exports = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token has required scope
    if (!decoded.scope || !decoded.scope.includes('read:accounts')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    console.log('🔍 Customer Auth - Decoded token:', decoded);

    // Verify customer exists and is active - WITH ORGANIZATION
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
              // Remove the where clause to get full data
            },
          ],
        },
      ],
    });

    if (!customer) {
      return res.status(401).json({ message: 'Invalid customer' });
    }

    // Attach customer AND organizationId to request
    req.customer = customer;
    req.orgId = decoded.organizationId; // This is the key missing piece!

    console.log('✅ Customer auth successful:', {
      customerId: req.customer.id,
      organizationId: req.orgId,
      hasStakeholder: !!customer.Stakeholder,
      hasPerson: !!customer.Stakeholder?.Person,
    });

    next();
  } catch (err) {
    console.error('❌ Customer auth error:', err.message);
    res.status(401).json({ message: 'Unauthorized: ' + err.message });
  }
};
