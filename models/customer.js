const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const Stakeholder = require("./stakeholder");
const Branch = require("./branch");


const Customer = sequelize.define("Customer", {
    typeId: DataTypes.INTEGER,
    language: DataTypes.INTEGER,
    loanLimit: DataTypes.DECIMAL(10, 2),
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    whatsApp: DataTypes.STRING(32),
    email: DataTypes.STRING(64),
    telegram: DataTypes.STRING(32),
    whatsAppEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    telegramEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailEnabled: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: "customers",
    timestamps: false
});

Customer.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(Customer, { foreignKey: "organizationId" });

Customer.belongsTo(Stakeholder, { foreignKey: "stakeholderId" });
Stakeholder.hasOne(Customer, { foreignKey: "stakeholderId" });

Customer.belongsTo(Branch, { foreignKey: { name: "branchId", allowNull: true } });
Branch.hasMany(Customer, { foreignKey: { name: "branchId", allowNull: true } });


module.exports = Customer;
