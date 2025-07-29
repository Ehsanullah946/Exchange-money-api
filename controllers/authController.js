require("dotenv").config();
const jwt= require("jsonwebtoken");
const catchAsynch = require("../middlewares/catchAsynch");
const UserAccount = require("../models/userAccount");
const AppError = require("../utils/appError");
const Organization = require("../models/organization");
const bcrypt = require("bcryptjs");


const generateToken = (id, organizationId) => {
     // eslint-disable-next-line no-undef
    return jwt.sign({ id, organizationId }, process.env.JWT_SECRET, {
        // eslint-disable-next-line no-undef
        expiresIn: process.env.JWT_EXPIRES_IN
    })
};



exports.register = catchAsynch(async (req, res, next) => {
    
    const { username, password, email, usertypeId, organizationName, whatsApp } = req.body;

    if (!username || !password || !email || !organizationName) {
        return next(new AppError("please provide the required field", 400));
    }
    

    const existingUser = await UserAccount.findOne({ where: {email} });

    if (existingUser) {
        return next(new AppError("the email has already exists", 400));
    }

    const organization = await Organization.create({
        name: organizationName
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    // creating new user
  try {
    
      const newUser = await UserAccount.create({
          username,
          password: hashedPassword,
          email,
          usertypeId,
          whatsApp,
          organizationId: organization.id
        })
        
        const token = generateToken(newUser.id, organization.id);
        
        res.status(200).json({
            status: "success",
            data: {
                token
            }
        });
    } catch (error) {
      console.log(error);
    }
});




exports.login = catchAsynch(async (req, res,next) => {

    const { email, password } = req.body;
    
    if (!email || !password) {
        return next(new AppError("please provide email and password", 400));
    }

    const user = await UserAccount.findOne({ email });

    if (!user) return next(new AppError("invalid emial or password",401));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return next(new AppError("email or password is not correct please try again",401))
    }

    res.status(200).json({
        status: "success",
        token: generateToken(user.id, user.organizationId)
    })


});