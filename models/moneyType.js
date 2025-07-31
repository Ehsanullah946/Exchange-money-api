
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");

const MoneyType = sequelize.define("MoneyType", {
    type: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "types",
    timestamps: false
});

MoneyType.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(MoneyType, { foreignKey: "organizationId" });

module.exports = MoneyType;
