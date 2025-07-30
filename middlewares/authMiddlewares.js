const jwt= require("jsonwebtoken");
const AppError = require("../utils/appError");
const catchAsynch = require("./catchAsynch");
const UserAccount = require("../models/userAccount");

exports.protect = catchAsynch(async (req, res,next) => {
   
    try {
        let token;
        
    if (req.headers.authorization && 
         req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("you are not access to this page or data", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await UserAccount.findByPk(decoded.id);
    if (!user) {
        return next(new AppError("user not found", 401));
    }
    
    req.user={
        id: user.id,
        organizationId: decoded.organizationId,
        role:user.usertypeId
    }
    
    next();
} catch (error) {
        res.status(401).json("not authorized token feild"+ error);
}
    
});