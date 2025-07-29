const jwt= require("jsonwebtoken");
const catchAsynch = require("../middlewares/catchAsynch")
require("dotenv").config();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
});



exports.signup =catchAsynch(async(req, res) => { 

})
exports.login = catchAsynch(async (req, res) => {

});