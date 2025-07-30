exports.allowRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({message:"access denide"})
        }
        next();
     }
}





//      usertypeId    Role Name	                  Permissions
//	       1          Super Admin	                  Can manage everything across all organizations (optional, for you as developer).
// 	       2          Org Admin	                  Full control inside their organization.
// 	       3          Employee                     Can view and edit some data inside their organization but not delete high-level records.
//         4          Viewer	                      Read-only access inside their organization.