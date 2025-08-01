const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
// const Organization = require("./organization");
// const Stakeholder = require("./stakeholder");
// const Branch = require("./branch");

const Customer = sequelize.define("Customer", {
    typeId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    language: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    loanLimit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    whatsApp: {
        type: DataTypes.STRING(32),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    telegram: {
        type: DataTypes.STRING(32),
        allowNull: true
    },
    whatsAppEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    telegramEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    stakeholderId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
}, {
    tableName: "customers",
    timestamps: false
});

// Relations
// Customer.belongsTo(Organization, { foreignKey: "organizationId" });
// Organization.hasMany(Customer, { foreignKey: "organizationId" });

// Customer.belongsTo(Stakeholder, { foreignKey: "stakeholderId" });
// Stakeholder.hasOne(Customer, { foreignKey: "stakeholderId" });

// Customer.belongsTo(Branch, { foreignKey: "branchId" });
// Branch.hasMany(Customer, { foreignKey: "branchId" });

module.exports = Customer;
