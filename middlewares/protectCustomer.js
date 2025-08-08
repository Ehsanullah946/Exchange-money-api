const jwt = require('jsonwebtoken');
const { Customer,Stakeholder,Person } = require('../models');

// exports.protectCustomer = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith('Bearer')
//   ) {
//     token = req.headers.authorization.split(' ')[1];
//   }

//   if (!token) {
//     return res.status(401).json({ message: 'Not authorized, token missing' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     if (decoded.role !== 'customer') {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     const customer = await Customer.findByPk(decoded.customerId);

//     if (!customer) {
//       return res.status(404).json({ message: 'Customer not found' });
//     }

//     req.customerId = decoded.customerId;
//     req.stakeholderId = decoded.stakeholderId;
//     req.organizationId = decoded.organizationId;
//     next();
//   } catch (err) {
//     res.status(401).json({ message: 'Invalid token', err });
//   }
// };


exports.protectCustomer = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
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

    // Verify customer exists WITH organization context
    const customer = await Customer.findOne({
      where: { id: decoded.customerId },
      include: [{
        model: Stakeholder,
        required: true,
        include: [{
          model: Person,
          required: true,
          where: { organizationId: decoded.organizationId }
        }]
      }]
    });

    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found in this organization',
        details: {
          customerId: decoded.customerId,
          organizationId: decoded.organizationId
        }
      });
    }

    // Attach all necessary IDs to request
    req.customer = customer; // Attach full customer object
    req.customerId = customer.id;
    req.stakeholderId = customer.stakeholderId;
    req.organizationId = decoded.organizationId;
    
    next();
  } catch (err) {
    res.status(401).json({ 
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
};