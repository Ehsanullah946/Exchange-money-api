
const {Account} = require("../models")

exports.getAccounts = async (req, res) => {
    try{
    const account = await Account.findAll({ where: { organizationId: req.orgId } })
    
       res.status(200).json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

exports.getAccountById = async(req,res) => {
    
}
exports.createAccount =async (req,res) => {
      try {
    const account = await Account.create({
      typeName: req.body.typeName,
      organizationId: req.orgId
    });
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
exports.updateAccount =async (req,res) => {
    
}
exports.deleteAccount =async (req,res) => {
    
}
