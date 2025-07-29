const sequelize = require('../config/database');

const Organization = require('./organization');
const Person = require('./person');
const Stakeholder = require('./stakeholder');
const Customer = require('./customer');
const Employee = require('./employee');
const Exchanger = require('./exchanger');
const SenderReceiver = require('./senderReceiver');
const UserAccount = require('./userAccount');

module.exports = {
  sequelize,
  Organization,
  Person,
  Stakeholder,
  Customer,
  Employee,
  Exchanger,
  SenderReceiver,
  UserAccount
};
