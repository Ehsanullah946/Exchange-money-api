const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const Branch = sequelize.define("Branch", {
    contractType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    faxNo: {
        type: DataTypes.STRING(32),
        allowNull: true
    },
    direct: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: "branches",
    timestamps: false
});

// Relations
// Branch.belongsTo(Organization, { foreignKey: "organizationId" });
// Organization.hasMany(Branch, { foreignKey: "organizationId" });

// Branch.belongsTo(Customer, { foreignKey: "customerId" });
// Customer.hasOne(Branch, { foreignKey: "customerId" });

module.exports = Branch;

