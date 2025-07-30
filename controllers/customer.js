
const Customer = require("../models/customer")
const orgScope = require("../middlewares/orgScope");


module.exports = orgScope(Customer);