const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const Stakeholder = require("./stakeholder");

const Branch = sequelize.define("Branch", {
    contractType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    faxNo: { type: DataTypes.STRING, allowNull: true },
    direct: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: "branches",
    timestamps: false
});

// Relations
Branch.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(Branch, { foreignKey: "organizationId" });

// Each Branch is linked to a Stakeholder (and therefore to a Person)
Branch.belongsTo(Stakeholder, { foreignKey: "stakeholderId" });
Stakeholder.hasOne(Branch, { foreignKey: "stakeholderId" });

module.exports = Branch;
