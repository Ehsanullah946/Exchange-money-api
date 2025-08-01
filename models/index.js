const sequelize = require("../config/database");

// Import models
const Organization = require("./organization");
const Person = require("./person");
const Stakeholder = require("./stakeholder");
const Customer = require("./customer");
const Employee = require("./employee");
const Exchanger = require("./exchanger");
const SenderReceiver = require("./senderReceiver");
const UserAccount = require("./userAccount");
const Branch = require("./branch");
const Account = require("./account");
const Exchange = require("./exchange");
const Transfer = require("./transfer");
const Receive = require("./receive");
const MoneyType = require("./moneyType");
const ExtraReceiveNo = require("./extraReceiveNumber");
const ExtraTransferNo = require("./extraTransferNumber");

// ----------------
// Define Associations
// ----------------

// Organization relationships
Organization.hasMany(UserAccount, { foreignKey: "organizationId" });
UserAccount.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Person, { foreignKey: "organizationId" });
Person.belongsTo(Organization,{
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Stakeholder, { foreignKey: "organizationId" });
Stakeholder.belongsTo(Organization,{
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Customer, { foreignKey: "organizationId" });
Customer.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Employee, { foreignKey: "organizationId" });
Employee.belongsTo(Organization,{
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Exchanger, { foreignKey: "organizationId" });
Exchanger.belongsTo(Organization,{
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(SenderReceiver, { foreignKey: "organizationId" });
SenderReceiver.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Branch, { foreignKey: "organizationId" });
Branch.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Account, { foreignKey: "organizationId" });
Account.belongsTo(Organization,{
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Exchange, { foreignKey: "organizationId" });
Exchange.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Transfer, { foreignKey: "organizationId" });
Transfer.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Organization.hasMany(Receive, { foreignKey: "organizationId" });
Receive.belongsTo(Organization, {
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

MoneyType.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(MoneyType,{
  foreignKey: { name: "organizationId", allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

// Person → Stakeholder → Customer
Stakeholder.belongsTo(Person, { foreignKey: "personId" });
Person.hasOne(Stakeholder, { foreignKey: "personId" });

Stakeholder.belongsTo(Person, { foreignKey: "personId" });
Customer.belongsTo(Stakeholder, { foreignKey: "stakeholderId" });

Stakeholder.hasOne(Customer, { foreignKey: "stakeholderId" });

// Branch → Customers
Branch.hasMany(Customer, { foreignKey: "branchId" });
Customer.belongsTo(Branch, { foreignKey: "branchId" });

// Transfer & Receive use SenderReceiver
Transfer.belongsTo(SenderReceiver, { as: "Sender", foreignKey: "senderId" });
Transfer.belongsTo(SenderReceiver, { as: "Receiver", foreignKey: "receiverId" });
Transfer.belongsTo(Employee, { foreignKey: "employeeId" });
Transfer.belongsTo(Customer, { foreignKey: "customerId" });
Transfer.belongsTo(Exchange, { foreignKey: "exchangeId" });
Transfer.belongsTo(Branch, { foreignKey: "toWhere" });

// Receiver ralationship
Receive.belongsTo(SenderReceiver, { as: "Sender", foreignKey: "senderId" });
Receive.belongsTo(SenderReceiver, { as: "Receiver", foreignKey: "receiverId" });
Receive.belongsTo(Branch, { foreignKey: "fromWhere" });
Receive.belongsTo(MoneyType, { foreignKey: "moneyTypeId" });
Receive.belongsTo(Employee, { foreignKey: "employeeId" });
Receive.belongsTo(Customer, { foreignKey: "customerId" });
Receive.belongsTo(Exchange, { foreignKey: "exchangeId" });

// Exchange linked to Transfer / Receive
Exchange.belongsTo(Transfer, { foreignKey: "transferId" });
Exchange.belongsTo(Receive, { foreignKey: "receiveId" });
Exchange.belongsTo(Employee, { foreignKey: "employeeId" });
Exchange.belongsTo(Customer, { foreignKey: "customerId" });

// MoneyType relations
Transfer.belongsTo(MoneyType, { foreignKey: "moneyTypeId" });
Receive.belongsTo(MoneyType, { foreignKey: "moneyTypeId" });
Exchange.belongsTo(MoneyType, { as: "SaleType", foreignKey: "saleMoneyType" });
Exchange.belongsTo(MoneyType, { as: "PurchaseType", foreignKey: "purchaseMoneyType" });

// Extra No tables
ExtraReceiveNo.belongsTo(Receive, { foreignKey: "receiveId" });
Receive.hasMany(ExtraReceiveNo, { foreignKey: "receiveId" });

ExtraTransferNo.belongsTo(Transfer, { foreignKey: "transferId" });
Transfer.hasMany(ExtraTransferNo, { foreignKey: "transferId" });

ExtraTransferNo.belongsTo(Branch, { foreignKey: "branchId" });
Branch.hasMany(ExtraTransferNo, { foreignKey: "branchId" });

// user account 
UserAccount.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasOne(UserAccount, { foreignKey: 'employeeId' });


// senderReceiver
SenderReceiver.belongsTo(Stakeholder, { foreignKey: 'stakeholderId' });
Stakeholder.hasOne(SenderReceiver, { foreignKey: 'stakeholderId' });

// person-exchanger
Exchanger.belongsTo(Person, { foreignKey: 'personId' });
Person.hasOne(Exchanger, { foreignKey: 'personId' });



// Export all models
module.exports = {
    sequelize,
    Organization,
    Person,
    Stakeholder,
    Customer,
    Employee,
    Exchanger,
    SenderReceiver,
    UserAccount,
    Branch,
    Account,
    Exchange,
    Transfer,
    Receive,
    MoneyType,
    ExtraReceiveNo,
    ExtraTransferNo
};
