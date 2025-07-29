const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Organization = sequelize.define("Organization", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "organizations",
    timestamps: false
});

module.exports = Organization;