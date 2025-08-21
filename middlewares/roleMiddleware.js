const AppError = require('../utils/appError');

// middlewares/roleMiddleware.js

exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if this is a customer route (skip role check)
    if (req.customer) {
      return next(); // This is a customer request, skip role checking
    }

    // This is an admin/user request

    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

//      usertypeId    Role Name	                       Permissions

//	       1          Super Admin	                  Can manage everything across all organizations (optional, for you as developer).
// 	       2          Org Admin	                      Full control inside their organization.
// 	       3          Employee                        Can view and edit some data inside their organization but not delete high-level records.
//         4          Viewer	                      Read-only access inside their organization.
