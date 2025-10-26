const AppError = require('../utils/appError');

exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

// Add this for organization-specific access
exports.requireOrganizationAccess = () => {
  return (req, res, next) => {
    if (!req.user || !req.user.organizationId) {
      return next(new AppError('Organization access required', 401));
    }
    next();
  };
};

//      usertypeId    Role Name	                       Permissions

//	       1          Super Admin	                  Can manage everything across all organizations (optional, for you as developer).
// 	       2          Org Admin	                      Full control inside their organization.
// 	       3          Employee                        Can view and edit some data inside their organization but not delete high-level records.
//         4          Viewer	                      Read-only access inside their organization.
