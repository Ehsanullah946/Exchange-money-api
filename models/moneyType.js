
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MoneyType = sequelize.define("MoneyType", {
    typeName: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "types",
    timestamps: false
});


module.exports = MoneyType;
