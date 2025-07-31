const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const MoneyType = require("./moneyType");
const Employee = require("./employee");
const Customer = require("./customer");
const Transfer = require("./transfer");
const Receive = require("./receive");

const Exchange = sequelize.define("Exchange", {
    rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
    saleAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    purchaseAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    eDate: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT },
    fingerprint: { type: DataTypes.BLOB },
    photo: { type: DataTypes.BLOB },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    swap: { type: DataTypes.BOOLEAN, defaultValue: false },
    calculate: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: "exchanges",
    timestamps: false
});

// Relations
Exchange.belongsTo(MoneyType, { as: "SaleType", foreignKey: "saleMoneyTypeId" });
Exchange.belongsTo(MoneyType, { as: "PurchaseType", foreignKey: "purchaseMoneyTypeId" });
Exchange.belongsTo(Employee, { foreignKey: "employeeId" });
Exchange.belongsTo(Customer, { foreignKey: "customerId" });
Exchange.belongsTo(Transfer, { foreignKey: "transferId" });
Exchange.belongsTo(Receive, { foreignKey: "receiveId" });
Exchange.belongsTo(Organization, { foreignKey: "organizationId" });

module.exports = Exchange;
