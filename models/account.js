const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const Customer = require("./customer");
const MoneyType = require("./moneyType");

const Account = sequelize.define("Account", {
    credit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    dateOfCreation: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    smsEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    whatsApp: { type: DataTypes.BOOLEAN, defaultValue: false },
    email: { type: DataTypes.BOOLEAN, defaultValue: false },
    telegramEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: "accounts",
    timestamps: false
});

// Relations
Account.belongsTo(MoneyType, { foreignKey: "typeId" });
MoneyType.hasMany(Account, { foreignKey: "typeId" });

Account.belongsTo(Customer, { foreignKey: "customerId" });
Customer.hasMany(Account, { foreignKey: "customerId" });

Account.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(Account, { foreignKey: "organizationId" });

module.exports = Account;
