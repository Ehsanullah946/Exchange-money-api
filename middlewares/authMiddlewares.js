const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const catchAsynch = require('./catchAsynch');
const { UserAccount } = require('../models');
const { Organization } = require('../models');

exports.protect = catchAsynch(async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Then check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(
        new AppError('You are not authorized to access this page', 401)
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user with organization
    const user = await UserAccount.findByPk(decoded.id, {
      include: [
        {
          model: Organization,
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!user) {
      return next(new AppError('User not found', 401));
    }

    // Set user data in request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      organizationId: user.organizationId,
      role: user.usertypeId,
      user: user, // include full user object if needed
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return next(new AppError('Not authorized - token invalid', 401));
  }
});
